/* ==========================================================================
   VOIXNETTE — Moteur Audio Partagé 100 % Local (WebAudio API + WAV PCM 16-bit)
   Zéro upload serveur : décodage, DSP, synthèse démo & encodage WAV en pur JS
   ========================================================================== */

(function () {
  'use strict';

  let sharedAudioCtx = null;

  function getAudioContext() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      throw new Error('Votre navigateur ne supporte pas la WebAudio API.');
    }
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(function () {});
    }
    return sharedAudioCtx;
  }

  /**
   * Convertit une amplitude linéaire [0..1] en dBFS
   */
  function ampToDb(amp) {
    if (amp <= 1e-6) return -120;
    return 20 * Math.log10(amp);
  }

  /**
   * Convertit des dBFS en amplitude linéaire
   */
  function dbToAmp(db) {
    return Math.pow(10, db / 20);
  }

  /**
   * Décode un fichier audio local (MP3, WAV, OGG/OPUS, M4A, WebM) en AudioBuffer
   */
  async function decodeFile(file) {
    const ctx = getAudioContext();
    const arrayBuffer = await file.arrayBuffer();
    // Clone buffer car decodeAudioData détache le buffer sur certains navigateurs
    const copy = arrayBuffer.slice(0);
    return await ctx.decodeAudioData(copy);
  }

  /**
   * Encode un AudioBuffer en fichier WAV PCM 16-bit signé (Little-Endian)
   */
  function encodeWav(audioBuffer) {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const numFrames = audioBuffer.length;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numFrames * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    function writeStr(offset, str) {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    }

    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true); // Taille du chunk PCM
    view.setUint16(20, 1, true);  // Format PCM (1)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true); // 16 bits par échantillon
    writeStr(36, 'data');
    view.setUint32(40, dataSize, true);

    const channels = [];
    for (let ch = 0; ch < numChannels; ch++) {
      channels.push(audioBuffer.getChannelData(ch));
    }

    let offset = 44;
    for (let i = 0; i < numFrames; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        let sample = channels[ch][i];
        if (sample > 1) sample = 1;
        else if (sample < -1) sample = -1;
        const int16 = sample < 0 ? Math.round(sample * 32768) : Math.round(sample * 32767);
        view.setInt16(offset, int16, true);
        offset += 2;
      }
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  /**
   * Retourne un mix mono Float32Array d'un AudioBuffer pour analyse / waveform
   */
  function getMonoData(audioBuffer) {
    const len = audioBuffer.length;
    const numCh = audioBuffer.numberOfChannels;
    if (numCh === 1) return audioBuffer.getChannelData(0);

    const mono = new Float32Array(len);
    for (let ch = 0; ch < numCh; ch++) {
      const data = audioBuffer.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        mono[i] += data[i] / numCh;
      }
    }
    return mono;
  }

  /**
   * Analyse complète d'un AudioBuffer (Peak, RMS, estimation LUFS, facteur de crête)
   */
  function analyzeBuffer(audioBuffer) {
    const numCh = audioBuffer.numberOfChannels;
    const len = audioBuffer.length;
    let peak = 0;
    let sumSq = 0;
    let totalSamples = len * numCh;

    for (let ch = 0; ch < numCh; ch++) {
      const data = audioBuffer.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const val = data[i];
        const abs = val < 0 ? -val : val;
        if (abs > peak) peak = abs;
        sumSq += val * val;
      }
    }

    const rms = Math.sqrt(sumSq / Math.max(1, totalSamples));
    const peakDb = ampToDb(peak);
    const rmsDb = ampToDb(rms);

    // Estimation LUFS intégrée (fenêtres actives > -50 dB, pondération simplifiée ITU-R BS.1770)
    const mono = getMonoData(audioBuffer);
    const blockSize = Math.max(1, Math.floor(audioBuffer.sampleRate * 0.4));
    let activeSumSq = 0;
    let activeBlocks = 0;
    const gateAmpSq = Math.pow(dbToAmp(-50), 2);

    for (let start = 0; start < mono.length; start += Math.floor(blockSize / 2)) {
      const end = Math.min(mono.length, start + blockSize);
      if (end - start < blockSize * 0.25) break;
      let blockSq = 0;
      for (let i = start; i < end; i++) {
        blockSq += mono[i] * mono[i];
      }
      const meanSq = blockSq / (end - start);
      if (meanSq >= gateAmpSq) {
        activeSumSq += meanSq;
        activeBlocks++;
      }
    }

    const activeMeanSq = activeBlocks > 0 ? activeSumSq / activeBlocks : (rms * rms);
    // Offset standard BS.1770 (-0.691 dB) appliqué au RMS actif
    const lufsApprox = activeMeanSq > 1e-10 ? (-0.691 + 10 * Math.log10(activeMeanSq)) : -70;
    const crestFactorDb = Math.max(0, peakDb - rmsDb);

    return {
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channels: numCh,
      peak: peak,
      peakDb: peakDb,
      rms: rms,
      rmsDb: rmsDb,
      lufsApprox: lufsApprox,
      crestFactorDb: crestFactorDb
    };
  }

  /**
   * Détecte les plages de silence et calcule les segments vocaux à conserver
   */
  function detectSilences(audioBuffer, thresholdDb, minSilenceSec, paddingMs) {
    const mono = getMonoData(audioBuffer);
    const sr = audioBuffer.sampleRate;
    const duration = audioBuffer.duration;
    const winSec = 0.01; // Fenêtre de 10 ms
    const winSamples = Math.max(1, Math.floor(sr * winSec));
    const numWins = Math.ceil(mono.length / winSamples);
    const thresholdAmp = dbToAmp(thresholdDb);

    // 1. Marquer chaque fenêtre de 10 ms comme silencieuse ou active
    const isSilentWin = new Uint8Array(numWins);
    for (let w = 0; w < numWins; w++) {
      const start = w * winSamples;
      const end = Math.min(mono.length, start + winSamples);
      let sumSq = 0;
      for (let i = start; i < end; i++) {
        sumSq += mono[i] * mono[i];
      }
      const rms = Math.sqrt(sumSq / Math.max(1, end - start));
      if (rms < thresholdAmp) {
        isSilentWin[w] = 1;
      }
    }

    // 2. Regrouper les silences contigus >= minSilenceSec
    const rawSilences = [];
    let silStart = -1;
    for (let w = 0; w <= numWins; w++) {
      const silent = w < numWins ? isSilentWin[w] === 1 : false;
      if (silent && silStart === -1) {
        silStart = w;
      } else if (!silent && silStart !== -1) {
        const sTime = silStart * winSec;
        const eTime = Math.min(duration, w * winSec);
        if (eTime - sTime >= minSilenceSec) {
          rawSilences.push({ start: sTime, end: eTime });
        }
        silStart = -1;
      }
    }

    // 3. Appliquer le padding (marge conservée autour de la voix)
    const padSec = Math.max(0, (paddingMs || 0) / 1000);
    const trimmedSilences = [];
    for (let i = 0; i < rawSilences.length; i++) {
      const r = rawSilences[i];
      const cutStart = Math.min(r.end, r.start + (r.start === 0 ? 0 : padSec));
      const cutEnd = Math.max(cutStart, r.end - (r.end >= duration - 0.02 ? 0 : padSec));
      if (cutEnd - cutStart > 0.02) {
        trimmedSilences.push({ start: cutStart, end: cutEnd });
      }
    }

    // 4. Construire les segments à conserver (complément des silences coupés)
    const keepRegions = [];
    let cursor = 0;
    for (let i = 0; i < trimmedSilences.length; i++) {
      const s = trimmedSilences[i];
      if (s.start > cursor + 0.005) {
        keepRegions.push({ start: cursor, end: s.start });
      }
      cursor = s.end;
    }
    if (cursor < duration - 0.005) {
      keepRegions.push({ start: cursor, end: duration });
    }

    let keptDuration = 0;
    for (let i = 0; i < keepRegions.length; i++) {
      keptDuration += keepRegions[i].end - keepRegions[i].start;
    }
    const removedDuration = Math.max(0, duration - keptDuration);
    const savedPercent = duration > 0 ? (removedDuration / duration) * 100 : 0;

    return {
      silenceRegions: trimmedSilences,
      keepRegions: keepRegions,
      originalDuration: duration,
      keptDuration: keptDuration,
      removedDuration: removedDuration,
      savedPercent: savedPercent,
      silenceCount: trimmedSilences.length
    };
  }

  /**
   * Reconstruit un AudioBuffer propre à partir des segments vocaux conservés
   * avec micro-fondu anti-clic de 5 ms aux raccords
   */
  function removeSilences(audioBuffer, keepRegions) {
    const ctx = getAudioContext();
    const sr = audioBuffer.sampleRate;
    const numCh = audioBuffer.numberOfChannels;

    if (!keepRegions || keepRegions.length === 0) {
      // Sécurité : retourner 0.5 s de silence minimal plutôt qu'un buffer vide invalide
      return ctx.createBuffer(numCh, Math.floor(sr * 0.5), sr);
    }

    const fadeSamples = Math.floor(sr * 0.005); // 5 ms anti-clic
    let totalFrames = 0;
    const sliceBounds = keepRegions.map(function (reg) {
      const startIdx = Math.max(0, Math.floor(reg.start * sr));
      const endIdx = Math.min(audioBuffer.length, Math.floor(reg.end * sr));
      const length = Math.max(0, endIdx - startIdx);
      totalFrames += length;
      return { startIdx: startIdx, endIdx: endIdx, length: length };
    });

    if (totalFrames < 1) {
      return ctx.createBuffer(numCh, Math.floor(sr * 0.5), sr);
    }

    const outBuffer = ctx.createBuffer(numCh, totalFrames, sr);

    for (let ch = 0; ch < numCh; ch++) {
      const src = audioBuffer.getChannelData(ch);
      const dst = outBuffer.getChannelData(ch);
      let writeOffset = 0;

      for (let r = 0; r < sliceBounds.length; r++) {
        const b = sliceBounds[r];
        const segLen = b.length;
        const localFade = Math.min(fadeSamples, Math.floor(segLen / 4));

        for (let i = 0; i < segLen; i++) {
          let s = src[b.startIdx + i];
          if (i < localFade) {
            s *= i / localFade;
          } else if (i >= segLen - localFade) {
            s *= (segLen - 1 - i) / localFade;
          }
          dst[writeOffset + i] = s;
        }
        writeOffset += segLen;
      }
    }

    return outBuffer;
  }

  /**
   * Normalise un AudioBuffer (mode 'peak', 'lufs', ou 'manual') avec limiteur anti-saturation
   */
  function normalizeBuffer(audioBuffer, options) {
    const ctx = getAudioContext();
    const mode = (options && options.mode) || 'peak';
    const targetDb = typeof options.targetDb === 'number' ? options.targetDb : -1.0;
    const manualGainDb = typeof options.manualGainDb === 'number' ? options.manualGainDb : 0;
    const limiterEnabled = options.limiter !== false;
    const ceilingDb = typeof options.ceilingDb === 'number' ? options.ceilingDb : -0.5;

    const beforeStats = analyzeBuffer(audioBuffer);
    let gainDb = 0;

    if (mode === 'peak') {
      gainDb = beforeStats.peak > 1e-6 ? (targetDb - beforeStats.peakDb) : 0;
    } else if (mode === 'lufs') {
      gainDb = targetDb - beforeStats.lufsApprox;
      // Limiter le gain maximal raisonnable à +28 dB pour éviter de remonter le souffle extrême
      gainDb = Math.max(-24, Math.min(28, gainDb));
    } else {
      gainDb = manualGainDb;
    }

    const linearGain = dbToAmp(gainDb);
    const ceilingAmp = dbToAmp(ceilingDb);
    const numCh = audioBuffer.numberOfChannels;
    const len = audioBuffer.length;
    const outBuffer = ctx.createBuffer(numCh, len, audioBuffer.sampleRate);

    let limitedSamples = 0;

    for (let ch = 0; ch < numCh; ch++) {
      const src = audioBuffer.getChannelData(ch);
      const dst = outBuffer.getChannelData(ch);

      for (let i = 0; i < len; i++) {
        let v = src[i] * linearGain;
        if (limiterEnabled) {
          const abs = v < 0 ? -v : v;
          if (abs > ceilingAmp) {
            limitedSamples++;
            // Soft-knee tanh saturation douce au-dessus du plafond pour éviter tout écrêtage dur
            const sign = v < 0 ? -1 : 1;
            const excess = (abs - ceilingAmp) / (1 - ceilingAmp + 0.001);
            v = sign * (ceilingAmp + (0.995 - ceilingAmp) * Math.tanh(excess));
          }
        } else {
          if (v > 1) {
            v = 1;
            limitedSamples++;
          } else if (v < -1) {
            v = -1;
            limitedSamples++;
          }
        }
        dst[i] = v;
      }
    }

    const afterStats = analyzeBuffer(outBuffer);
    return {
      buffer: outBuffer,
      appliedGainDb: gainDb,
      limitedSamples: limitedSamples,
      beforeStats: beforeStats,
      afterStats: afterStats
    };
  }

  /**
   * Découpe un AudioBuffer entre startSec et endSec avec Fade-In / Fade-Out cosinus doux
   */
  function trimBuffer(audioBuffer, startSec, endSec, fadeInSec, fadeOutSec) {
    const ctx = getAudioContext();
    const sr = audioBuffer.sampleRate;
    const numCh = audioBuffer.numberOfChannels;

    const safeStart = Math.max(0, Math.min(audioBuffer.duration, startSec));
    const safeEnd = Math.max(safeStart + 0.05, Math.min(audioBuffer.duration, endSec));

    const startIdx = Math.floor(safeStart * sr);
    const endIdx = Math.min(audioBuffer.length, Math.floor(safeEnd * sr));
    const outLen = Math.max(1, endIdx - startIdx);

    const outBuffer = ctx.createBuffer(numCh, outLen, sr);
    const fadeInSamples = Math.min(Math.floor((fadeInSec || 0) * sr), Math.floor(outLen * 0.5));
    const fadeOutSamples = Math.min(Math.floor((fadeOutSec || 0) * sr), Math.floor(outLen * 0.5));

    for (let ch = 0; ch < numCh; ch++) {
      const src = audioBuffer.getChannelData(ch);
      const dst = outBuffer.getChannelData(ch);

      for (let i = 0; i < outLen; i++) {
        let s = src[startIdx + i];
        if (fadeInSamples > 0 && i < fadeInSamples) {
          const t = i / fadeInSamples;
          s *= 0.5 - 0.5 * Math.cos(Math.PI * t);
        }
        if (fadeOutSamples > 0 && i >= outLen - fadeOutSamples) {
          const t = (outLen - 1 - i) / fadeOutSamples;
          s *= 0.5 - 0.5 * Math.cos(Math.PI * t);
        }
        dst[i] = s;
      }
    }

    return outBuffer;
  }

  /**
   * Ré-échantillonne un AudioBuffer à une vitesse donnée (0.5x à 3.0x)
   * avec interpolation linéaire propre pour export WAV immédiat
   */
  function resampleSpeedBuffer(audioBuffer, rate) {
    const ctx = getAudioContext();
    const safeRate = Math.max(0.5, Math.min(3.0, rate || 1.0));
    const sr = audioBuffer.sampleRate;
    const numCh = audioBuffer.numberOfChannels;
    const srcLen = audioBuffer.length;
    const outLen = Math.max(1, Math.floor(srcLen / safeRate));

    const outBuffer = ctx.createBuffer(numCh, outLen, sr);

    for (let ch = 0; ch < numCh; ch++) {
      const src = audioBuffer.getChannelData(ch);
      const dst = outBuffer.getChannelData(ch);

      for (let i = 0; i < outLen; i++) {
        const pos = i * safeRate;
        const idx0 = Math.floor(pos);
        const idx1 = Math.min(srcLen - 1, idx0 + 1);
        const frac = pos - idx0;
        dst[i] = src[idx0] * (1 - frac) + src[idx1] * frac;
      }
    }

    return outBuffer;
  }

  /**
   * Dessine une forme d'onde haute densité sur un Canvas HTML5 (zéro dégradé, esthétique console)
   */
  function drawWaveform(canvas, audioBuffer, options) {
    if (!canvas || !audioBuffer) return;
    const opts = options || {};
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(300, Math.floor(rect.width || canvas.width || 800));
    const height = Math.max(120, Math.floor(rect.height || canvas.height || 200));

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. Fond console sombre pur
    ctx.fillStyle = opts.bgColor || '#14161A';
    ctx.fillRect(0, 0, width, height);

    // 2. Grille technique (horizontale et verticale)
    ctx.strokeStyle = '#22252B';
    ctx.lineWidth = 1;
    const vSteps = 8;
    for (let i = 1; i < vSteps; i++) {
      const x = Math.round((width / vSteps) * i) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    const hLines = [0.25, 0.5, 0.75];
    for (let j = 0; j < hLines.length; j++) {
      const y = Math.round(height * hLines[j]) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const duration = audioBuffer.duration || 1;
    const midY = height / 2;

    // 3. Zones de silence détectées (surlignage rouge REC)
    if (Array.isArray(opts.silenceRegions)) {
      for (let i = 0; i < opts.silenceRegions.length; i++) {
        const reg = opts.silenceRegions[i];
        const x1 = (reg.start / duration) * width;
        const x2 = (reg.end / duration) * width;
        const w = Math.max(1, x2 - x1);
        ctx.fillStyle = 'rgba(225, 45, 57, 0.22)';
        ctx.fillRect(x1, 0, w, height);
        ctx.fillStyle = '#E12D39';
        ctx.fillRect(x1, 0, w, 3);
        ctx.fillRect(x1, height - 3, w, 3);
      }
    }

    // 4. Zone hors sélection (pour le Découpeur Audio)
    if (typeof opts.selectionStart === 'number' && typeof opts.selectionEnd === 'number') {
      const sx1 = (opts.selectionStart / duration) * width;
      const sx2 = (opts.selectionEnd / duration) * width;
      ctx.fillStyle = 'rgba(17, 18, 20, 0.72)';
      ctx.fillRect(0, 0, sx1, height);
      ctx.fillRect(sx2, 0, width - sx2, height);

      // Liseré de sélection actif
      ctx.strokeStyle = '#E12D39';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx1, 0);
      ctx.lineTo(sx1, height);
      ctx.moveTo(sx2, 0);
      ctx.lineTo(sx2, height);
      ctx.stroke();

      // Poignées visuelles hautes
      ctx.fillStyle = '#E12D39';
      ctx.fillRect(Math.max(0, sx1 - 5), 0, 10, 14);
      ctx.fillRect(Math.min(width - 10, sx2 - 5), 0, 10, 14);
    }

    // 5. Tracé de la forme d'onde (barres min/max précises)
    const mono = getMonoData(audioBuffer);
    const barGap = 1;
    const barWidth = 2;
    const stepPx = barWidth + barGap;
    const numBars = Math.floor(width / stepPx);
    const samplesPerBar = Math.max(1, Math.floor(mono.length / numBars));
    const waveColor = opts.waveColor || '#F3F1EC';
    const maxAmpHeight = height * 0.44;

    ctx.fillStyle = waveColor;
    for (let b = 0; b < numBars; b++) {
      const start = b * samplesPerBar;
      const end = Math.min(mono.length, start + samplesPerBar);
      let peak = 0;
      for (let s = start; s < end; s += Math.max(1, Math.floor(samplesPerBar / 64))) {
        const v = mono[s] < 0 ? -mono[s] : mono[s];
        if (v > peak) peak = v;
      }
      const h = Math.max(2, peak * maxAmpHeight * 2);
      const x = b * stepPx;
      const y = midY - h / 2;

      // Colorer différemment si dans une zone de silence
      if (Array.isArray(opts.silenceRegions) && opts.silenceRegions.length > 0) {
        const barTime = (x / width) * duration;
        let inSil = false;
        for (let k = 0; k < opts.silenceRegions.length; k++) {
          if (barTime >= opts.silenceRegions[k].start && barTime <= opts.silenceRegions[k].end) {
            inSil = true;
            break;
          }
        }
        ctx.fillStyle = inSil ? '#7A383E' : waveColor;
      }
      ctx.fillRect(x, y, barWidth, h);
    }

    // 6. Lignes de seuil dB (optionnel, utile pour coupe-silence)
    if (typeof opts.thresholdDb === 'number') {
      const thAmp = dbToAmp(opts.thresholdDb);
      const offsetPx = thAmp * maxAmpHeight;
      ctx.save();
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, midY - offsetPx);
      ctx.lineTo(width, midY - offsetPx);
      ctx.moveTo(0, midY + offsetPx);
      ctx.lineTo(width, midY + offsetPx);
      ctx.stroke();
      ctx.restore();
    }

    // 7. Ligne centrale 0 dB
    ctx.strokeStyle = '#3E4450';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, Math.round(midY) + 0.5);
    ctx.lineTo(width, Math.round(midY) + 0.5);
    ctx.stroke();

    // 8. Tête de lecture (playhead)
    if (typeof opts.playheadSec === 'number' && opts.playheadSec >= 0 && opts.playheadSec <= duration) {
      const px = (opts.playheadSec / duration) * width;
      ctx.strokeStyle = '#22C55E';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height);
      ctx.stroke();
    }

    // 9. Repères temporels discrets en bas
    ctx.fillStyle = '#9DA3AE';
    ctx.font = '500 10px "JetBrains Mono", monospace';
    for (let t = 0; t <= 4; t++) {
      const sec = (duration / 4) * t;
      const label = window.VoixNetteUI ? window.VoixNetteUI.formatTimecode(sec, false) : sec.toFixed(1) + 's';
      let tx = (width / 4) * t + 6;
      if (t === 4) tx = width - 42;
      ctx.fillText(label, tx, height - 8);
    }

    ctx.restore();
  }

  /**
   * Génère localement une piste vocale de démonstration réaliste (~16 secondes)
   * composée de 5 phrases synthétisées (formants + intonation + syllabes)
   * séparées par de vrais silences et un léger souffle de pièce (-54 dB).
   * Permet de tester TOUS les outils en 1 clic sans charger aucun fichier.
   */
  function generateDemoVoiceBuffer(variant) {
    const ctx = getAudioContext();
    const sr = 44100;
    const duration = 16.0;
    const totalSamples = Math.floor(sr * duration);
    const buffer = ctx.createBuffer(1, totalSamples, sr);
    const data = buffer.getChannelData(0);

    // Niveau de base : un peu bas (-9 dB peak) si variant === 'quiet' pour démontrer le normaliseur
    const masterGain = variant === 'quiet' ? 0.28 : 0.62;

    // 5 segments parlés séparés par des pauses réalistes (total silence ~7,1 s = ~44 %)
    const phrases = [
      { start: 0.7, end: 2.8, baseF0: 132, syllables: 7 },
      { start: 4.1, end: 6.0, baseF0: 145, syllables: 6 },
      { start: 7.6, end: 9.8, baseF0: 126, syllables: 8 },
      { start: 11.4, end: 13.1, baseF0: 152, syllables: 5 },
      { start: 14.2, end: 15.4, baseF0: 138, syllables: 4 }
    ];

    // Générateur pseudo-aléatoire déterministe (bruit de fond pièce réaliste à ~-54 dB)
    let seed = 42193;
    function nextRand() {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return (seed / 4294967296) * 2 - 1;
    }

    // 1. Remplir avec un léger bruit de fond de studio/pièce
    const roomFloor = variant === 'quiet' ? 0.0014 : 0.0022;
    let lpNoise = 0;
    for (let i = 0; i < totalSamples; i++) {
      const white = nextRand();
      lpNoise = lpNoise * 0.85 + white * 0.15;
      data[i] = lpNoise * roomFloor;
    }

    // 2. Synthétiser chaque phrase avec enveloppes syllabiques & harmoniques vocales
    for (let p = 0; p < phrases.length; p++) {
      const ph = phrases[p];
      const startIdx = Math.floor(ph.start * sr);
      const endIdx = Math.floor(ph.end * sr);
      const phLen = endIdx - startIdx;
      const phDur = ph.end - ph.start;

      let phase1 = 0;
      let phase2 = 0;
      let phase3 = 0;
      let phase4 = 0;

      for (let i = 0; i < phLen; i++) {
        const t = i / sr;
        const progress = t / phDur;

        // Enveloppe globale de phrase (attaque 40ms, relâchement 60ms)
        let phraseEnv = 1.0;
        if (t < 0.04) phraseEnv = t / 0.04;
        else if (phDur - t < 0.06) phraseEnv = (phDur - t) / 0.06;

        // Cadence syllabique réaliste
        const sylPhase = progress * ph.syllables * Math.PI * 2;
        const sylEnv = 0.25 + 0.75 * Math.pow(0.5 + 0.5 * Math.sin(sylPhase - Math.PI / 2), 1.6);

        // Contour d'intonation naturelle (légère montée puis descente finale)
        const f0 = ph.baseF0 * (1 + 0.09 * Math.sin(progress * Math.PI * 1.4) - 0.08 * progress);

        phase1 += (2 * Math.PI * f0) / sr;
        phase2 += (2 * Math.PI * f0 * 2.0) / sr;
        phase3 += (2 * Math.PI * f0 * 3.01) / sr;
        phase4 += (2 * Math.PI * f0 * 5.02) / sr;

        // Timbre vocal chaud (fondamentale + formants moyens + léger souffle consonne)
        const harmonic =
          0.52 * Math.sin(phase1) +
          0.28 * Math.sin(phase2 + 0.4) +
          0.14 * Math.sin(phase3 + 0.9) +
          0.06 * Math.sin(phase4);

        const breath = nextRand() * 0.045 * (1 - sylEnv * 0.4);
        const sample = (harmonic + breath) * phraseEnv * sylEnv * masterGain;
        data[startIdx + i] += sample;
      }
    }

    return buffer;
  }

  window.VoixNetteAudio = {
    getAudioContext: getAudioContext,
    ampToDb: ampToDb,
    dbToAmp: dbToAmp,
    decodeFile: decodeFile,
    encodeWav: encodeWav,
    getMonoData: getMonoData,
    analyzeBuffer: analyzeBuffer,
    detectSilences: detectSilences,
    removeSilences: removeSilences,
    normalizeBuffer: normalizeBuffer,
    trimBuffer: trimBuffer,
    resampleSpeedBuffer: resampleSpeedBuffer,
    drawWaveform: drawWaveform,
    generateDemoVoiceBuffer: generateDemoVoiceBuffer
  };
})();
