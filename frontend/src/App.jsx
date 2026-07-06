import React, { useState, useCallback, useEffect } from "react";
import Header from "./components/Header";
import LeftPanel from "./components/LeftPanel";
import CenterCanvas from "./components/CenterCanvas";
import RightPanel from "./components/RightPanel";

const AUDIENCES = ["student", "junior", "senior", "pm"];

const API_BASE = import.meta.env.VITE_API_URL || "";

export default function App() {
  const [audience, setAudience] = useState("junior");
  const [auditData, setAuditData] = useState(null);
  const [scanId, setScanId] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingGithub, setIsFetchingGithub] = useState(false);
  const [error, setError] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [activeTrace, setActiveTrace] = useState(null);

  // â”€â”€ Fetch scan history on mount â”€â”€
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/history`);
      if (response.ok) {
        const data = await response.json();
        setScanHistory(data);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  };

  // â”€â”€ Execute Audit â”€â”€
  const handleExecuteAudit = useCallback(async (fileTree, projectName) => {
    setIsLoading(true);
    setError(null);
    setAuditData(null);
    setSelectedDistrict(null);
    setChatMessages([]);
    setActiveTrace(null);
    setScanId(null);

    try {
      const response = await fetch(`${API_BASE}/api/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileTree, projectName: projectName || "Untitled Scan" }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();
      setAuditData(data);
      setScanId(data.scanId);

      // Auto-select the first district
      if (data.districts && data.districts.length > 0) {
        setSelectedDistrict(data.districts[0]);
      }

      // Refresh history
      fetchHistory();
    } catch (err) {
      console.error("Audit failed:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // â”€â”€ Fetch GitHub Repo â”€â”€
  const handleGitHubFetch = useCallback(async (repoUrl) => {
    setIsFetchingGithub(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/github/fetch-tree`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl }),
      });

      if (!response.ok) {
        let errorMsg = `Server responded with ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch {
          // Response body was empty or not JSON
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      setIsFetchingGithub(false);
      
      // Auto-execute audit with the fetched tree
      await handleExecuteAudit(data.fileTree, data.repoName);
      return data;
    } catch (err) {
      console.error("GitHub fetch failed:", err);
      setError(err.message);
      setIsFetchingGithub(false);
      return null;
    }
  }, [handleExecuteAudit]);

  // â”€â”€ Load Past Scan â”€â”€
  const handleLoadScan = useCallback(async (id) => {
    try {
      const response = await fetch(`${API_BASE}/api/history/${id}`);
      if (!response.ok) throw new Error("Failed to load scan");

      const data = await response.json();
      setAuditData(data.full_json);
      setScanId(data.id);
      setActiveTrace(null);
      setChatMessages(data.chatMessages || []);

      if (data.full_json.districts && data.full_json.districts.length > 0) {
        setSelectedDistrict(data.full_json.districts[0]);
      }
    } catch (err) {
      console.error("Failed to load scan:", err);
      setError(err.message);
    }
  }, []);

  // â”€â”€ Node Click â”€â”€
  const handleNodeClick = useCallback(
    (districtId) => {
      if (!auditData) return;
      const district = auditData.districts.find((d) => d.id === districtId);
      if (district) {
        setSelectedDistrict(district);
      }
    },
    [auditData]
  );

  // â”€â”€ Agent Chat â”€â”€
  const handleChatSend = useCallback(
    async (message) => {
      if (!selectedDistrict || !message.trim()) return;

      const userMsg = {
        role: "user",
        content: message,
        node_id: selectedDistrict.id,
        created_at: new Date().toISOString(),
      };

      setChatMessages((prev) => [...prev, userMsg]);
      setIsChatLoading(true);

      try {
        // Build node data with related violations
        const nodeData = {
          ...selectedDistrict,
          violations: auditData?.complianceViolations?.filter(
            (v) =>
              v.affectedDistricts?.includes(selectedDistrict.id) ||
              v.issue.toLowerCase().includes(selectedDistrict.name.toLowerCase())
          ),
        };

        const response = await fetch(`${API_BASE}/api/agent/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scanId,
            nodeId: selectedDistrict.id,
            userMessage: message,
            activeNodeData: nodeData,
          }),
        });

        const data = await response.json();

        const agentMsg = {
          role: "agent",
          content: data.reply,
          node_id: selectedDistrict.id,
          created_at: new Date().toISOString(),
        };

        setChatMessages((prev) => [...prev, agentMsg]);
      } catch (err) {
        const errorMsg = {
          role: "agent",
          content: `âš ï¸ Failed to get response: ${err.message}`,
          node_id: selectedDistrict.id,
          created_at: new Date().toISOString(),
        };
        setChatMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsChatLoading(false);
      }
    },
    [selectedDistrict, scanId, auditData]
  );

  // â”€â”€ Delete Scan â”€â”€
  const handleDeleteScan = useCallback(async (id) => {
    try {
      await fetch(`${API_BASE}/api/history/${id}`, { method: "DELETE" });
      fetchHistory();
      // If we deleted the currently loaded scan, clear it
      if (scanId === id) {
        setAuditData(null);
        setScanId(null);
        setSelectedDistrict(null);
        setChatMessages([]);
      }
    } catch (err) {
      console.error("Failed to delete scan:", err);
    }
  }, [scanId]);

  return (
    <div className="h-screen w-screen flex flex-col bg-canvas overflow-hidden">
      {/* â”€â”€ Header â”€â”€ */}
      <Header
        audience={audience}
        setAudience={setAudience}
        audiences={AUDIENCES}
        isOnline={true}
      />

      {/* â”€â”€ Main Layout â”€â”€ */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <LeftPanel
          onExecute={handleExecuteAudit}
          onGitHubFetch={handleGitHubFetch}
          onLoadScan={handleLoadScan}
          onDeleteScan={handleDeleteScan}
          scanHistory={scanHistory}
          isLoading={isLoading}
          isFetchingGithub={isFetchingGithub}
          activeScanId={scanId}
        />

        {/* Center Canvas */}
        <CenterCanvas
          auditData={auditData}
          selectedDistrictId={selectedDistrict?.id}
          onNodeClick={handleNodeClick}
          isLoading={isLoading}
          error={error}
          activeTrace={activeTrace}
          setActiveTrace={setActiveTrace}
        />

        {/* Right Panel */}
        <RightPanel
          auditData={auditData}
          selectedDistrict={selectedDistrict}
          audience={audience}
          chatMessages={chatMessages.filter(
            (m) => m.node_id === selectedDistrict?.id
          )}
          onChatSend={handleChatSend}
          isChatLoading={isChatLoading}
        />
      </div>
    </div>
  );
}

