import PageHeader from "../Navbar/pageHeader";
import { useState, useEffect } from "react";
import RecruiterIcon from "../../Assets/Images/RecruiterIcon.png";
import ChatIconWhite from "../../Assets/Images/ChatIconWhite.png";
import EditIcon from "../../Assets/Images/EditIcon.png";
import RecruiterDetails from "./recruiterDetails";
import Me from "../../Assets/Images/me.jpg";
import { useNavigate, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

/*USE A USE REFERENCE ON THE LOGIN PAGE TO STORE A REFERENCE TO THE
CURRENT USER. THEN, SIMPLY EXTRACT THE CURRENT USER'S DATA WHENEVER NEEDED
*/
function ProfilePageRecruiter(){
    const navigate = useNavigate();
    const user = useSelector((state) => state.user.user);
    const [name, setName] = useState(()=>(user ? user.name :""));
    if(!user) return <Navigate to="/" replace />

    return(
    <div className='Backlayer'>
        <PageHeader />
        <h1 className="Pagetitle"> 
            <img src={EditIcon} alt="Edit" height="50px" /> &nbsp;
            Profile &nbsp;
            <img src={RecruiterIcon} alt="User type" height="50px" />
        </h1>
        
        <div className="Bodysection">
            <div className="Textpartition title">
                {name}
                <img src={ChatIconWhite} alt="Chat!" height="50px"/>
            </div>
            <div className="Textpartition">
                <div className="Left text">
                    <RecruiterDetails />
                    {user?.type==="recruiters" && (
                        <button className="Button" onClick={()=>navigate("/addjob")}> Add new job </button>
                    )}
                </div>
                <div className="Right"> 
                    <img src={Me} alt="Recruiter" width="500px"/>
                </div>
            </div>
        </div>
    </div>
    )
}

export default ProfilePageRecruiter;