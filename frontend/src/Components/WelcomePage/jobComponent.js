import office from "../../Assets/Images/office.jpeg";
import { useNavigate } from "react-router-dom";

function JobComponent(props){
    const navigate = useNavigate();

    const {id, title, company, yoeNeeded, salary, benefits= [], recruiterName, recruiter, jobImage, matchPercentage, hasApplied} = props;
    const displayRecruiter = recruiterName || recruiter || "Jobbing";
    const displayImg = jobImage || office;

    return(
        <div className="Textpartition" onClick={()=>navigate(`/job/${id}`)} style={{ cursor: "pointer" }}>
            <div className="Left text">
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "4px" }}>
                    <span style={{ fontWeight: "bold" }}>Position: {title}</span>
                    {matchPercentage !== undefined && (
                        <span style={{ 
                            backgroundColor: matchPercentage >= 75 ? "#2e7d32" : matchPercentage >= 50 ? "#ed6c02" : "#555",
                            color: "#fff",
                            padding: "2px 10px",
                            borderRadius: "12px",
                            fontSize: "14px",
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
                            fontSize: "14px",
                            fontWeight: "bold"
                        }}>
                            Applied
                        </span>
                    )}
                </div>
                Company: {company} <br />
                Recruiter: {displayRecruiter} <br />
                YoE Needed: {yoeNeeded} <br />
                Benefits: {benefits.join(", ")}
            </div>
            <div className="Right job">
                <p className="Right text"> Salary: ${salary}/mo </p>
                <img src={displayImg} className="Job-image" alt="Job" height="100px" style={{ objectFit: "cover" }} />
            </div>
        </div>
    )
}

export default JobComponent;