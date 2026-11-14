import ProfileIcon from "../../Assets/Images/ProfileIcon.png";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import MatchBreakdownModal from "./matchBreakdownModal";

function UserComponent(props){
    const navigate = useNavigate();
    const showMatchPercentage = useSelector((state) => state.user.showMatchPercentage);
    const [showBreakdown, setShowBreakdown] = useState(false);

    const {id, name, age, yoe, work=[], profilePic, matchPercentage, matchBreakdown, hasApplied} = props;
    const companyNames = work.map((job)=>job.company);
    const workText = companyNames.length > 0 ? `Work: ${companyNames.join(", ")}` : "No work experience";

    return(
        <>
            <div className="Textpartition" onClick={()=>navigate(`/applicants/${id}`)} style={{ cursor: "pointer", padding: "24px", alignItems: "center" }}>
                <div className="Left text" style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap", marginBottom: "8px" }}>
                        <span style={{ fontSize: "40px", fontWeight: "bold" }}>{name}</span>
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
                                backgroundColor: "#1976d2",
                                color: "#fff",
                                padding: "4px 14px",
                                borderRadius: "14px",
                                fontSize: "24px",
                                fontWeight: "bold"
                            }}>
                                Applied
                            </span>
                        )}
                    </div>
                    <div style={{ fontSize: "34px", lineHeight: "1.4" }}>
                        Age: {age} <br />
                        YoE: {yoe} <br />
                        {workText}
                    </div>
                </div>
                <div className="Right job" style={{ marginLeft: "20px" }}>
                    <img 
                        src={profilePic || ProfileIcon} 
                        className="Job-image" 
                        alt="Applicant" 
                        style={{ 
                            width: "120px",
                            height: "120px", 
                            borderRadius: "50%",
                            objectFit: "cover", 
                            backgroundColor: profilePic ? "transparent" : "#F0EAEB",
                            border: "3px solid #B7202E"
                        }} 
                    />
                </div>
            </div>

            <MatchBreakdownModal 
                isOpen={showBreakdown}
                onClose={() => setShowBreakdown(false)}
                title={name}
                subtitle={`Candidate Profile`}
                matchPercentage={matchPercentage}
                matchBreakdown={matchBreakdown}
            />
        </>
    )
}

export default UserComponent;