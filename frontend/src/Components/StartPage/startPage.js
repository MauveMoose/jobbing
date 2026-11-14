import Logo from "../../Assets/Images/Logo.png";
import ssbas from "../../Assets/Images/ssbas.png";
import { useNavigate } from "react-router-dom";

function StartPage(){
    const navigate = useNavigate();

    return(
        <div className="Backlayer start">
            <img 
                src={ssbas} 
                alt="SSBAS Somaiya Logo" 
                style={{ 
                    maxHeight: "85px", 
                    maxWidth: "280px", 
                    objectFit: "contain", 
                    marginBottom: "15px",
                    filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.1))"
                }} 
            />
            <img src={Logo} alt="Jobbing Logo" /> 
            <div style={{ marginTop: "20px" }}>
                <button className="Button" onClick={()=>navigate("/login")}> Login </button> <br />
                <button className="Button" onClick={()=>navigate("/register")}> Sign up </button> <br />
            </div>
        </div>
    )
}

export default StartPage;