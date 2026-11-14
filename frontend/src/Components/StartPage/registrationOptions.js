import Logo from "../../Assets/Images/Logo.png"
import { useNavigate } from "react-router-dom";
import FormHeader from "../Navbar/formHeader";

function RegistrationOptions(){
    const navigate = useNavigate();

    return(
        <div className="Backlayer start">
            <FormHeader />
            <h1 className="Pagetitle"> You are...</h1>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "20px", flexWrap: "wrap", marginTop: "20px" }}>
                <button className="Button" style={{ width: "260px" }} onClick={()=>navigate("/register/options")}> An Applicant </button>
                <span style={{ fontSize: "36px", color: "#1A1A1A", fontStyle: "italic", fontWeight: "bold" }}>or...</span>
                <button className="Button" style={{ width: "260px" }} onClick={()=>navigate("/register/recruiter")}> Placement Cell </button>
            </div>
        </div>
    )
}

export default RegistrationOptions;