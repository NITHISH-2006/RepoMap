import React, { useState, useCallback } from "react";
import Header from "./components/Header";
import LeftPanel from "./components/LeftPanel";
import CenterCanvas from "./components/CenterCanvas";
import RightPanel from "./components/RightPanel";

const AUDIENCES = ["student", "junior", "senior", "pm"];

export default function App() {
  const [audience, setAudience] = useState("junior");
  const [auditData, setAuditData] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleExecuteAudit = useCallback(async (fileTree) => {
    setIsLoading(true);
    setError(null);
    setAuditData(null);
    setSelectedDistrict(null);

    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileTree }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();
      setAuditData(data);

      // Auto-select the first district
      if (data.districts && data.districts.length > 0) {
        setSelectedDistrict(data.districts[0]);
      }
    } catch (err) {
      console.error("Audit failed:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  return (
    <div className="h-screen w-screen flex flex-col bg-canvas overflow-hidden">
      {/* ── Header ── */}
      <Header
        audience={audience}
        setAudience={setAudience}
        audiences={AUDIENCES}
        isOnline={true}
      />

      {/* ── Main Layout ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <LeftPanel
          onExecute={handleExecuteAudit}
          isLoading={isLoading}
        />

        {/* Center Canvas */}
        <CenterCanvas
          auditData={auditData}
          selectedDistrictId={selectedDistrict?.id}
          onNodeClick={handleNodeClick}
          isLoading={isLoading}
          error={error}
        />

        {/* Right Panel */}
        <RightPanel
          auditData={auditData}
          selectedDistrict={selectedDistrict}
          audience={audience}
        />
      </div>
    </div>
  );
}
