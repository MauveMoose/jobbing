import office from "../../Assets/Images/office.jpeg";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import MatchBreakdownModal from "./matchBreakdownModal";

function JobComponent(props){
    const navigate = useNavigate();
    const showMatchPercentage = useSelector((state) => state.user.showMatchPercentage);
    const [showBreakdown, setShowBreakdown] = useState(false);

    const {id, title, company, yoeNeeded, salary, benefits= [], recruiterName, recruiter, jobImage, matchPercentage, matchBreakdown, hasApplied, applicationStatus} = props;
    const displayRecruiter = recruiterName || recruiter || "Jobbing";
    const displayImg = jobImage || office;

    const isAccepted = applicationStatus === "Accepted";

    const formattedSalary = salary && Number(salary) > 0 
        ? `$${Number(salary).toLocaleString('en-US')}/mo`
        : "Negotiable";

    return(
        <>
            <div className="Textpartition" onClick={()=>navigate(`/job/${id}`)} style={{ cursor: "pointer", alignItems: "center", justifyContent: "space-between", padding: "28px" }}>
                <div className="Left text" style={{ flex: 1, paddingRight: "24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap", marginBottom: "10px" }}>
                        <span style={{ fontWeight: "bold", fontSize: "42px" }}>Position: {title}</span>
                        {showMatchPercentage && matchPercentage !== undefined && (
                            <span 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowBreakdown(true);
                                }}
                                title="Click to view Algorithmic Match Breakdown"
                                style={{ 
                                    backgroundColor: matchPercentage >= 75 ? "#2e7d32" : matchPercentage >= 50 ? "#ed6c02" : "#555",
                                    color: "#fff",
                                    padding: "4px 14px",
                                    borderRadius: "14px",
                                    fontSize: "24px",
                                    fontWeight: "bold",
                                    cursor: "pointer",
                                    border: "2px solid rgba(255,255,255,0.65)",
                                    boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
                                }}
                            >
                                {matchPercentage}% Match 🔍
                            </span>
                        )}
                        {hasApplied && (
                            <span style={{ 
                                backgroundColor: isAccepted ? "#2e7d32" : "#1976d2",
                                color: "#fff",
                                padding: "4px 14px",
                                borderRadius: "14px",
                                fontSize: "24px",
                                fontWeight: "bold"
                            }}>
                                {isAccepted ? "Accepted" : "Applied"}
                            </span>
                        )}
                    </div>
                    <div style={{ fontSize: "34px", lineHeight: "1.4" }}>
                        Company: <strong>{company}</strong> <br />
                        Posted by: {displayRecruiter} <br />
                        YoE Needed: {yoeNeeded || 0}+ <br />
                        Benefits: {benefits.length > 0 ? benefits.join(", ") : "None listed"}
                    </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", minWidth: "200px", flexShrink: 0 }}>
                    <img 
                        src={displayImg} 
                        alt="Job" 
                        style={{ 
                            width: "190px", 
                            height: "120px", 
                            objectFit: "cover", 
                            borderRadius: "12px",
                            border: "3px solid #B7202E"
                        }} 
                    />
                    <span style={{ 
                        fontSize: "28px", 
                        fontWeight: "bold", 
                        color: "#1A1A1A",
                        backgroundColor: "#FAECEE",
                        padding: "6px 16px",
                        borderRadius: "10px",
                        border: "2px solid #D5C5C7",
                        textAlign: "center",
                        whiteSpace: "nowrap"
                    }}>
                        Salary: {formattedSalary}
                    </span>
                </div>
            </div>

            <MatchBreakdownModal 
                isOpen={showBreakdown}
                onClose={() => setShowBreakdown(false)}
                title={title}
                subtitle={company}
                matchPercentage={matchPercentage}
                matchBreakdown={matchBreakdown}
            />
        </>
    )
}

export default JobComponent;