import { useState, useRef, useCallback } from "react";

export function useSpeechRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const isSupported = !!SR;

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recRef = useRef(null);
  const txRef = useRef("");

  const start = useCallback(() => {
    if (!SR) {
      alert("Voice recognition requires Chrome or Edge.");
      return;
    }

    txRef.current = "";
    setTranscript("");

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (event) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          txRef.current += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }
      setTranscript(txRef.current + interimText);
    };

    rec.onerror = () => {
      setIsRecording(false);
    };

    rec.onend = () => {
      setIsRecording(false);
    };

    recRef.current = rec;
    rec.start();
    setIsRecording(true);
  }, [SR]);

  const stop = useCallback(() => {
    if (recRef.current) {
      recRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const resetTranscript = useCallback(() => {
    txRef.current = "";
    setTranscript("");
  }, []);

  return { isSupported, isRecording, start, stop, transcript, resetTranscript };
}
