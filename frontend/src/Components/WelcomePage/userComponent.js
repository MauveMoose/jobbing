import ProfileWhite from "../../Assets/Images/ProfileWhite.png";
import { useNavigate } from "react-router-dom";

function UserComponent(props){
    const navigate = useNavigate();

    const {id, name, age, yoe, work=[], profilePic, matchPercentage, hasApplied} = props;
    const companyNames = work.map((job)=>job.company);
    const workText = companyNames.length > 0 ? `Work: ${companyNames.join(", ")}` : "No work experience";

    return(
        <div className="Textpartition" onClick={()=>navigate(`/applicants/${id}`)} style={{ cursor: "pointer" }}>
            <div className="Left text">
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    <span>{name}</span>
                    {matchPercentage !== undefined && (
                        <span style={{ 
                            backgroundColor: matchPercentage >= 75 ? "#2e7d32" : matchPercentage >= 50 ? "#ed6c02" : "#555",
                            color: "#fff",
                            padding: "2px 10px",
                            borderRadius: "12px",
                            fontSize: "20px",
                            fontWeight: "bold"
                        }}>
                            {matchPercentage}% Match
                        </span>
                    )}
                    {hasApplied && (
                        <span style={{ 
                            backgroundColor: "#1976d2",
                            color: "#fff",
                            padding: "2px 10px",
                            borderRadius: "12px",
                            fontSize: "20px",
                            fontWeight: "bold"
                        }}>
                            Applied
                        </span>
                    )}
                </div>
                Age: {age} <br />
                Yoe: {yoe} <br />
                {workText}
            </div>
            <div className="Right job">
                <img src={profilePic || ProfileWhite} className="Job-image" alt="Applicant" height="100px" />
            </div>
        </div>
    )
}

export default UserComponent;