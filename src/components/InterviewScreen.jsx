import { useState, useRef, useEffect, useCallback } from "react";
import { TIME_LIMIT } from "../constants";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import TimerRing from "./TimerRing";
import Waveform from "./Waveform";

const COUNTDOWN_SECONDS = 5;

function speakQuestion(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.95;
  utterance.pitch = 1;

  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(
    (v) => v.lang.startsWith("en") && v.name.toLowerCase().includes("female")
  ) || voices.find(
    (v) => v.lang.startsWith("en") && v.localService
  ) || voices.find(
    (v) => v.lang.startsWith("en")
  );
  if (preferred) utterance.voice = preferred;

  window.speechSynthesis.speak(utterance);
  return utterance;
}

export default function InterviewScreen({ questions, role, modelStatus, isCandidate, onFinish }) {
  const [idx, setIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [answers, setAnswers] = useState([]);
  const [timedOut, setTimedOut] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [reRecordCount, setReRecordCount] = useState(0);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);

  const {
    isSupported,
    isRecording,
    start: startRec,
    stop: stopRec,
    transcript,
    resetTranscript,
  } = useSpeechRecognition();

  const startRecRef = useRef(startRec);
  useEffect(() => { startRecRef.current = startRec; }, [startRec]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setCountdown(null);
  }, []);

  useEffect(() => {
    return () => { clearTimer(); clearCountdown(); };
  }, [clearTimer, clearCountdown]);

  const startCountdownThenRecord = useCallback(() => {
    let count = COUNTDOWN_SECONDS;
    setCountdown(count);

    countdownRef.current = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
        setCountdown(null);
        startRecRef.current();
      } else {
        setCountdown(count);
      }
    }, 1000);
  }, []);

  useEffect(() => {
    clearCountdown();

    const ensureVoices = () => {
      const utterance = speakQuestion(questions[idx]);
      if (utterance) {
        setIsSpeaking(true);
        utterance.onend = () => {
          setIsSpeaking(false);
          startCountdownThenRecord();
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          startCountdownThenRecord();
        };
      } else {
        startCountdownThenRecord();
      }
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      ensureVoices();
    } else {
      window.speechSynthesis.onvoiceschanged = ensureVoices;
    }

    return () => {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      clearCountdown();
    };
  }, [idx, questions, startCountdownThenRecord, clearCountdown]);

  useEffect(() => {
    if (!isRecording) {
      clearTimer();
      return;
    }

    setTimedOut(false);
    setTimeLeft(TIME_LIMIT);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopRec();
          clearTimer();
          setTimedOut(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return clearTimer;
  }, [isRecording, clearTimer, stopRec]);

  const handleReplay = () => {
    clearCountdown();
    const utterance = speakQuestion(questions[idx]);
    if (utterance) {
      setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        if (!isRecording && !transcript.trim()) {
          startCountdownThenRecord();
        }
      };
      utterance.onerror = () => setIsSpeaking(false);
    }
  };

  const handleRecord = () => {
    if (!isSupported) {
      alert("Voice recognition requires Chrome or Edge.");
      return;
    }
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    clearCountdown();
    if (isRecording) {
      stopRec();
    } else {
      startRec();
    }
  };

  const handleReRecord = () => {
    clearCountdown();
    resetTranscript();
    setTimedOut(false);
    setTimeLeft(TIME_LIMIT);
    setReRecordCount((prev) => prev + 1);
    startRec();
  };

  const handleNext = () => {
    window.speechSynthesis.cancel();
    clearCountdown();
    const updatedAnswers = [
      ...answers,
      { question: questions[idx], transcript: transcript.trim(), reRecords: reRecordCount },
    ];
    setAnswers(updatedAnswers);

    if (idx >= questions.length - 1) {
      onFinish(updatedAnswers);
      return;
    }

    setIdx((prev) => prev + 1);
    resetTranscript();
    setTimeLeft(TIME_LIMIT);
    setTimedOut(false);
    setReRecordCount(0);
  };

  const isLast = idx === questions.length - 1;
  const showTimerBar = isRecording || timeLeft < TIME_LIMIT;
  const timerBarWidth = ((TIME_LIMIT - timeLeft) / TIME_LIMIT) * 100;
  let timerBarColor = "var(--color-success)";
  if (timeLeft <= 5) timerBarColor = "var(--color-danger)";
  else if (timeLeft <= 15) timerBarColor = "var(--color-warning)";

  const canProceed = transcript.trim().length > 0 && !isRecording && countdown === null;
  const canReRecord = transcript.trim().length > 0 && !isRecording && countdown === null;

  return (
    <div className="screen interview-screen">
      <div className="progress-header">
        <span className="progress-counter mono">
          {String(idx + 1).padStart(2, "0")} /{" "}
          {String(questions.length).padStart(2, "0")}
        </span>
        <div className="progress-bar">
          {questions.map((_, i) => (
            <span
              key={i}
              className={`progress-pill ${
                i < idx ? "done" : i === idx ? "current" : "pending"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="question-card">
        <div className="question-card-top">
          <span className="question-card-label mono">interview question</span>
          <button
            className="btn-icon replay-btn"
            onClick={handleReplay}
            disabled={isSpeaking || isRecording}
            title="Replay question"
          >
            {isSpeaking ? "🔊" : "🔈"}
          </button>
        </div>
        <p className="question-card-text">{questions[idx]}</p>
        {isSpeaking && (
          <span className="speaking-indicator">Speaking...</span>
        )}
      </div>

      {countdown !== null && (
        <div className="countdown-banner">
          <span className="countdown-number mono">{countdown}</span>
          <span className="countdown-text">Recording starts in {countdown} second{countdown !== 1 ? "s" : ""}...</span>
        </div>
      )}

      <div className="controls-row">
        <button
          className={`btn ${isRecording ? "btn-danger" : "btn-record"}`}
          onClick={handleRecord}
          disabled={!isSupported || isSpeaking}
        >
          {isRecording ? "⏹ Stop" : "⏺ Record"}
        </button>

        {canReRecord && !isCandidate && (
          <button className="btn" onClick={handleReRecord}>
            ↻ Re-record
          </button>
        )}

        {isRecording && <Waveform />}
        {isRecording && <TimerRing timeLeft={timeLeft} />}
      </div>

      {showTimerBar && (
        <div className="timer-bar-track">
          <div
            className="timer-bar-fill"
            style={{
              width: `${timerBarWidth}%`,
              backgroundColor: timerBarColor,
            }}
          />
        </div>
      )}

      {timedOut && (
        <p className="text-muted timed-out-msg">
          Time's up — recording stopped automatically
        </p>
      )}

      {transcript && (
        <div className="transcript-panel">
          <span className="transcript-label mono">transcript</span>
          <p className="transcript-text">{transcript}</p>
        </div>
      )}

      {canProceed && (
        <button className="btn btn-primary" onClick={handleNext}>
          {isLast ? "Finish interview →" : "Next question →"}
        </button>
      )}
    </div>
  );
}
