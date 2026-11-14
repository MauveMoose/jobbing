import React from "react";

function MatchBreakdownModal({ isOpen, onClose, title, subtitle, matchPercentage, matchBreakdown }) {
    if (!isOpen) return null;

    const breakdown = matchBreakdown || {};
    const yoeScore = breakdown.yoeScore ?? 0;
    const candidateYoE = breakdown.candidateYoE ?? 0;
    const requiredYoE = breakdown.requiredYoE ?? 0;
    const skillScore = breakdown.skillScore ?? 0;
    const matchedSkills = breakdown.matchedSkills || [];
    const missingSkills = breakdown.missingSkills || [];
    const appliedBonus = breakdown.appliedBonus ?? 0;

    return (
        <div 
            onClick={(e) => {
                e.stopPropagation();
                onClose();
            }}
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.75)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 9999,
                padding: "20px",
                cursor: "default",
                fontFamily: "'JustAnotherHand', sans-serif"
            }}
        >
            <div 
                onClick={(e) => e.stopPropagation()}
                style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: "16px",
                    padding: "32px",
                    maxWidth: "720px",
                    width: "100%",
                    maxHeight: "88vh",
                    overflowY: "auto",
                    boxShadow: "0 12px 45px rgba(0,0,0,0.5)",
                    color: "#1A1A1A",
                    fontFamily: "'JustAnotherHand', sans-serif",
                    borderTop: "8px solid #B7202E"
                }}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #FAECEE", paddingBottom: "14px", marginBottom: "20px" }}>
                    <div>
                        <h2 style={{ color: "#B7202E", fontSize: "48px", margin: 0, fontWeight: "normal", letterSpacing: "0.5px" }}>
                            Algorithmic Match Breakdown
                        </h2>
                        {title && (
                            <div style={{ fontSize: "34px", color: "#444", marginTop: "2px" }}>
                                {title} {subtitle ? `— ${subtitle}` : ""}
                            </div>
                        )}
                    </div>
                    <span style={{ 
                        backgroundColor: matchPercentage >= 75 ? "#2e7d32" : matchPercentage >= 50 ? "#ed6c02" : "#555",
                        color: "#fff",
                        padding: "6px 20px",
                        borderRadius: "16px",
                        fontSize: "34px",
                        fontWeight: "bold",
                        whiteSpace: "nowrap"
                    }}>
                        {matchPercentage}% Match
                    </span>
                </div>

                {/* 1. Experience Score */}
                <div style={{ backgroundColor: "#F9F9F9", border: "1px solid #E0E0E0", borderRadius: "12px", padding: "16px 22px", marginBottom: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span style={{ fontSize: "36px", fontWeight: "bold", color: "#1A1A1A" }}>
                            1. Experience Suitability
                        </span>
                        <span style={{ fontSize: "36px", fontWeight: "bold", color: "#B7202E" }}>
                            {yoeScore} / 30 pts
                        </span>
                    </div>
                    <div style={{ fontSize: "30px", color: "#333" }}>
                        Candidate Experience: <strong>{candidateYoE} YoE</strong> &nbsp;|&nbsp; Required Minimum: <strong>{requiredYoE} YoE</strong>
                    </div>
                </div>

                {/* 2. Skill Tag Overlap */}
                <div style={{ backgroundColor: "#F9F9F9", border: "1px solid #E0E0E0", borderRadius: "12px", padding: "16px 22px", marginBottom: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <span style={{ fontSize: "36px", fontWeight: "bold", color: "#1A1A1A" }}>
                            2. AI Skill & Keyword Overlap
                        </span>
                        <span style={{ fontSize: "36px", fontWeight: "bold", color: "#B7202E" }}>
                            {skillScore} / 50 pts
                        </span>
                    </div>

                    <div style={{ marginBottom: "14px" }}>
                        <div style={{ fontSize: "30px", fontWeight: "bold", color: "#2e7d32", marginBottom: "8px" }}>
                            ✓ Matched Skills ({matchedSkills.length}):
                        </div>
                        {matchedSkills.length > 0 ? (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                                {matchedSkills.map((skill, idx) => (
                                    <span key={idx} style={{
                                        backgroundColor: "#E8F5E9",
                                        color: "#2e7d32",
                                        border: "1px solid #A5D6A7",
                                        padding: "4px 14px",
                                        borderRadius: "8px",
                                        fontSize: "28px",
                                        fontWeight: "bold",
                                        textTransform: "capitalize"
                                    }}>
                                        ✓ {skill}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <div style={{ fontSize: "28px", color: "#777", fontStyle: "italic" }}>
                                No overlapping skill tags detected.
                            </div>
                        )}
                    </div>

                    <div>
                        <div style={{ fontSize: "30px", fontWeight: "bold", color: "#c62828", marginBottom: "8px" }}>
                            ✗ Unmatched / Missing Skills ({missingSkills.length}):
                        </div>
                        {missingSkills.length > 0 ? (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                                {missingSkills.map((skill, idx) => (
                                    <span key={idx} style={{
                                        backgroundColor: "#FFEBEE",
                                        color: "#c62828",
                                        border: "1px solid #EF9A9A",
                                        padding: "4px 14px",
                                        borderRadius: "8px",
                                        fontSize: "28px",
                                        fontWeight: "bold",
                                        textTransform: "capitalize"
                                    }}>
                                        ✗ {skill}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <div style={{ fontSize: "28px", color: "#2e7d32", fontStyle: "italic" }}>
                                All target skills matched!
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Application Engagement Bonus */}
                <div style={{ backgroundColor: "#F9F9F9", border: "1px solid #E0E0E0", borderRadius: "12px", padding: "16px 22px", marginBottom: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span style={{ fontSize: "36px", fontWeight: "bold", color: "#1A1A1A" }}>
                            3. Active Application Status Bonus
                        </span>
                        <span style={{ fontSize: "36px", fontWeight: "bold", color: "#B7202E" }}>
                            {appliedBonus} / 20 pts
                        </span>
                    </div>
                    <div style={{ fontSize: "30px", color: "#333" }}>
                        {appliedBonus > 0 
                            ? "Candidate has actively applied (+20 pts priority boost)." 
                            : "Candidate has not applied yet (0 pts)."}
                    </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button 
                        type="button" 
                        className="Button" 
                        onClick={onClose}
                        style={{ fontSize: "32px", padding: "6px 28px", width: "auto" }}
                    >
                        Close Breakdown
                    </button>
                </div>
            </div>
        </div>
    );
}

export default MatchBreakdownModal;
