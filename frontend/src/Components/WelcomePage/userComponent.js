import Me from "../../Assets/Images/me.jpg";
import { useNavigate } from "react-router-dom";

function UserComponent(props){
    const navigate = useNavigate();

    const {id, name, age, yoe, work=[]} = props;
    const companyNames = work.map((job)=>job.company);
    const workText = companyNames.length > 0? `Work:${companyNames.join(", ")}`:"No work experience"
    return(
        <div className="Textpartition" onClick={()=>navigate(`/applicants/${id}`)}>
            <div className="Left text">
                {name} <br />
                Age: {age} <br />
                Yoe: {yoe} <br />
                {workText}
            </div>
            <div className="Right job">
                <img src={Me} className="Job-image" alt="Applicant" height="100px" />
            </div>
        </div>

    )
}

export default UserComponent;