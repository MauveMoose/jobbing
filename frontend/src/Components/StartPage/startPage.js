import Logo from "../../Assets/Images/Logo.png"
import { useNavigate } from "react-router-dom";

function StartPage(){
    const navigate = useNavigate();

    return(
        <div className="Backlayer start">
            <img src={Logo} alt="Jobbing Logo" /> 
            <div>
                <button className="Button" onClick={()=>navigate("/login")}> Login </button> <br />
                <button className="Button" onClick={()=>navigate("/register")}> Sign up </button> <br />
            </div>
        </div>
    )
}

export default StartPage;