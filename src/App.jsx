import { useState, useEffect } from "react";
import { checkModel } from "./utils/checkModel";
import ModelStatusBanner from "./components/ModelStatusBanner";
import SetupScreen from "./components/SetupScreen";
import WelcomeScreen from "./components/WelcomeScreen";
import InterviewScreen from "./components/InterviewScreen";
import SummaryScreen from "./components/SummaryScreen";

function parseConfigFromURL() {
  try {
    const hash = window.location.hash;
    if (!hash.startsWith("#/interview?config=")) return null;
    const encoded = hash.split("config=")[1];
    const json = atob(decodeURIComponent(encoded));
    const config = JSON.parse(json);
    if (config.questions && config.questions.length > 0) return config;
  } catch {
    // invalid config
  }
  return null;
}

export default function App() {
  const urlConfig = parseConfigFromURL();
  const isCandidate = !!urlConfig;

  const [screen, setScreen] = useState(isCandidate ? "welcome" : "setup");
  const [questions, setQuestions] = useState(isCandidate ? urlConfig.questions : []);
  const [role, setRole] = useState(isCandidate ? (urlConfig.role || "") : "");
  const [candidateName, setCandidateName] = useState(isCandidate ? (urlConfig.candidateName || "") : "");
  const plEmail = isCandidate ? (urlConfig.plEmail || "") : "";
  const timeLimit = isCandidate ? (urlConfig.timeLimit || null) : null;
  const [answers, setAnswers] = useState([]);
  const [modelStatus, setModelStatus] = useState("checking");

  useEffect(() => {
    checkModel().then(({ status }) => setModelStatus(status));
  }, []);

  const handleStart = (qs, r, name) => {
    setQuestions(qs);
    setRole(r);
    setCandidateName(name || "");
    setAnswers([]);
    setScreen("interview");
  };

  const handleFinish = (finalAnswers) => {
    setAnswers(finalAnswers);
    setScreen("summary");
  };

  const handleNewInterview = () => {
    window.location.hash = "";
    setQuestions([]);
    setRole("");
    setAnswers([]);
    setScreen("setup");
  };

  const handleRetry = () => {
    setAnswers([]);
    setScreen("interview");
  };

  return (
    <div className="app">
      <ModelStatusBanner status={modelStatus} />
      {screen === "setup" && <SetupScreen onStart={handleStart} />}
      {screen === "welcome" && (
        <WelcomeScreen
          questionCount={questions.length}
          role={role}
          candidateName={candidateName}
          timeLimit={timeLimit}
          onStart={() => setScreen("interview")}
        />
      )}
      {screen === "interview" && (
        <InterviewScreen
          questions={questions}
          role={role}
          modelStatus={modelStatus}
          isCandidate={isCandidate}
          timeLimit={timeLimit}
          onFinish={handleFinish}
        />
      )}
      {screen === "summary" && (
        <SummaryScreen
          answers={answers}
          questions={questions}
          role={role}
          candidateName={candidateName}
          isCandidate={isCandidate}
          plEmail={plEmail}
          modelStatus={modelStatus}
          onNewInterview={handleNewInterview}
          onRetry={handleRetry}
        />
      )}
    </div>
  );
}
