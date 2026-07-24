import Logo from "../../Assets/Images/Logo.png"
import { useNavigate } from "react-router-dom";
import FormHeader from "../Navbar/formHeader";

function RegistrationOptions(){
    const navigate = useNavigate();

    return(
        <div className="Backlayer start">
            <FormHeader />
            <h1 className="Pagetitle"> You are...</h1>
            <div>
                <button className="Button" onClick={()=>navigate("/register/options")}> An Applicant </button> <br />
                <button className="Button" onClick={()=>navigate("/register/recruiter")}> A Recruiter </button> <br />
            </div>
        </div>
    )
}

export default RegistrationOptions;