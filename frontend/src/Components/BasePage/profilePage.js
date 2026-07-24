import PageHeader from "../Navbar/pageHeader";
import { useState, useEffect } from "react";
import ApplicantIcon from "../../Assets/Images/ApplicantIcon.png";
import ChatIconWhite from "../../Assets/Images/ChatIconWhite.png";
import EditIcon from "../../Assets/Images/EditIcon.png";
import ProfileDetails from "./profileDetails";
import Me from "../../Assets/Images/me.jpg";
import { useSelector } from "react-redux";

/*USE A USE REFERENCE ON THE LOGIN PAGE TO STORE A REFERENCE TO THE
CURRENT USER. THEN, SIMPLY EXTRACT THE CURRENT USER'S DATA WHENEVER NEEDED
*/
function ProfilePage(){
    const user = useSelector((state)=>state.user.user);
    const [name, setName] = useState(()=>(user ? user.name :""));

    useEffect(() => {
        if(user) setName(user.name??"");
        else setName("");
    }, [user]);

    return(
    <div className='Backlayer'>
        <PageHeader />
        <h1 className="Pagetitle"> 
            <img src={EditIcon} alt="Edit" height="50px" /> &nbsp;
            Profile &nbsp;
            <img src={ApplicantIcon} alt="User type" height="50px" />
        </h1>
        
        <div className="Bodysection">
            <div className="Textpartition title">
                {name}
                <img src={ChatIconWhite} alt="Chat!" height="50px"/>
            </div>
            <div className="Textpartition">
                <div className="Left text">
                    <ProfileDetails />
                </div>
                <div className="Right"> 
                    <img src={Me} alt="Applicant" width="500px"/>
                </div>
            </div>
        </div>
    </div>
    )
}

export default ProfilePage;