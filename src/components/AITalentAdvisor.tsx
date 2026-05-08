"use client";

import { useEffect, useRef, useState } from "react";

const PROJECT_ID = "prj_a5746e6d2deb36c65aad";
const EMBED_TOKEN = "prj_a5746e6d2deb36c65aad";
const TARGET_ORIGIN = "https://maldevta.com";
const UID_STORAGE_KEY = "maldevta_uid";

function getOrCreateUid(): string {
  if (typeof window === "undefined") return "";
  let uid = window.localStorage.getItem(UID_STORAGE_KEY);
  if (!uid) {
    uid =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `uid_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(UID_STORAGE_KEY, uid);
  }
  return uid;
}

interface AITalentAdvisorProps {
  pendingPrompt: string | null;
  onPromptDelivered: () => void;
  onUserMessage?: (content: string) => void;
  onConversationReady?: (conversationId: string) => void;
  onAiResponse?: (content: string, conversationId: string) => void;
}

export default function AITalentAdvisor({
  pendingPrompt,
  onPromptDelivered,
  onUserMessage,
  onConversationReady,
  onAiResponse,
}: AITalentAdvisorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [uid, setUid] = useState("");
  const [ready, setReady] = useState(false);
  const busyRef = useRef(false);
  const queueRef = useRef<{ content: string; hideUserBubble: boolean }[]>([]);
  const onUserMessageRef = useRef(onUserMessage);
  const onConversationReadyRef = useRef(onConversationReady);
  const onAiResponseRef = useRef(onAiResponse);

  useEffect(() => {
    onUserMessageRef.current = onUserMessage;
  }, [onUserMessage]);

  useEffect(() => {
    onConversationReadyRef.current = onConversationReady;
  }, [onConversationReady]);

  useEffect(() => {
    onAiResponseRef.current = onAiResponse;
  }, [onAiResponse]);

  useEffect(() => {
    setUid(getOrCreateUid());
  }, []);

  function postCommand(cmd: object) {
    iframeRef.current?.contentWindow?.postMessage(cmd, TARGET_ORIGIN);
  }

  function drainQueue() {
    if (busyRef.current) return;
    const next = queueRef.current.shift();
    if (!next) return;
    busyRef.current = true;
    postCommand({
      type: "maldevta:send-message",
      payload: { content: next.content, hideUserBubble: next.hideUserBubble },
    });
  }

  function enqueueMessage(content: string, hideUserBubble = true) {
    queueRef.current.push({ content, hideUserBubble });
    if (ready) drainQueue();
  }

  useEffect(() => {
    function handler(e: MessageEvent) {
      if (e.origin !== TARGET_ORIGIN) return;
      const data = e.data;
      const type = typeof data === "object" && data ? data.type : null;
      if (typeof type !== "string" || !type.startsWith("maldevta:")) return;

      switch (type) {
        case "maldevta:ready": {
          setReady(true);
          const convId = data.payload?.conversationId;
          if (typeof convId === "string" && convId && onConversationReadyRef.current) {
            onConversationReadyRef.current(convId);
          }
          drainQueue();
          break;
        }
        case "maldevta:user-message-sent": {
          const convId = data.payload?.conversationId;
          if (typeof convId === "string" && convId && onConversationReadyRef.current) {
            onConversationReadyRef.current(convId);
          }
          busyRef.current = true;
          const content = data.payload?.content;
          if (typeof content === "string" && onUserMessageRef.current) {
            onUserMessageRef.current(content);
          }
          break;
        }
        case "maldevta:ai-response": {
          const convId = data.payload?.conversationId;
          if (typeof convId === "string" && convId && onConversationReadyRef.current) {
            onConversationReadyRef.current(convId);
          }
          const content = data.payload?.content;
          if (typeof content === "string" && onAiResponseRef.current) {
            onAiResponseRef.current(content, typeof convId === "string" ? convId : "");
          }
          busyRef.current = false;
          drainQueue();
          break;
        }
        case "maldevta:error":
          if (data.payload?.code !== "busy") busyRef.current = false;
          break;
      }
    }
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  useEffect(() => {
    if (!pendingPrompt) return;
    enqueueMessage(pendingPrompt, true);
    onPromptDelivered();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrompt]);

  const iframeSrc = uid
    ? `${TARGET_ORIGIN}/embed?projectId=${PROJECT_ID}&embedToken=${EMBED_TOKEN}&uid=${encodeURIComponent(uid)}&noHistory=true`
    : "";

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-180px)] min-h-[500px] max-h-[800px]">
      <div className="bg-[#1e3a5f] px-4 py-3">
        <div className="flex items-center gap-2">
          <i className="fas fa-robot text-white text-sm"></i>
          <h2 className="text-sm font-semibold text-white">AI Talent Advisor</h2>
        </div>
      </div>
      <div className="flex-1 p-3 min-h-0">
        {iframeSrc ? (
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            allow="microphone"
            className="w-full h-full border border-gray-200 rounded"
            style={{ minHeight: 400 }}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">
            <i className="fas fa-spinner fa-spin mr-2"></i>
            Initializing chat...
          </div>
        )}
      </div>
    </div>
  );
}
