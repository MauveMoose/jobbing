import office from "../../Assets/Images/office.jpeg";
import { useNavigate } from "react-router-dom";

function JobComponent(props){
    const navigate = useNavigate();

    const {id, title, company, yoeNeeded, salary, benefits= [], recruiterName, recruiter} = props;
    const displayRecruiter = recruiterName || recruiter || "Jobbing";

    return(
        <div className="Textpartition" onClick={()=>navigate(`/job/${id}`)}>
            <div className="Left text">
                Position: {title} <br />
                Company: {company} <br />
                Recruiter: {displayRecruiter} <br />
                YoE Needed: {yoeNeeded} <br />
                Benefits: {benefits.join(", ")}
            </div>
            <div className="Right job">
                <p className="Right text"> Salary: ${salary}/mo </p>
                <img src={office} className="Job-image" alt="Office" height="100px" />
            </div>
        </div>

    )
}

export default JobComponent;