import PageHeader from "../Navbar/pageHeader";
import { useState, useEffect, useRef } from "react";
import RecruiterIcon from "../../Assets/Images/RecruiterIcon.png";
import ChatIconWhite from "../../Assets/Images/ChatIconWhite.png";
import EditIcon from "../../Assets/Images/EditIcon.png";
import RecruiterDetails from "./recruiterDetails";
import ProfileIcon from "../../Assets/Images/ProfileIcon.png";
import { useNavigate, Navigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { setUser } from "../../redux/userSlice";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

function ProfilePageRecruiter(){
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const user = useSelector((state) => state.user.user);
    const [name, setName] = useState(()=>(user ? user.name :""));
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (user) setName(user.name ?? "");
    }, [user]);

    if(!user) return <Navigate to="/" replace />

    const handleImageUpload = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            alert("Profile picture size should be less than 5MB.");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64Image = reader.result;
            try {
                const res = await fetch(`${API_BASE_URL}/recruiters/${user._id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ profilePic: base64Image })
                });
                const data = await res.json();
                if (res.ok) {
                    dispatch(setUser(data.user));
                    alert("Profile picture updated successfully!");
                } else {
                    alert(data.message || "Failed to update profile picture.");
                }
            } catch (err) {
                console.error("Error updating profile picture:", err);
                alert("Error updating profile picture.");
            }
        };
        reader.readAsDataURL(file);
    };

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
                <a 
                    href="https://docs.google.com/spreadsheets/d/11PDEYw9vrwcFPjTSjWoOY6uQXBxcB4YeulFm3mH0kGk/edit?gid=0#gid=0" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    title="Open Placement Records Google Sheet"
                    style={{ textDecoration: "none" }}
                >
                    <img src={ChatIconWhite} alt="Google Sheet Records" height="50px" style={{ cursor: "pointer" }} />
                </a>
            </div>
            <div className="Textpartition">
                <div className="Left text">
                    <RecruiterDetails />
                </div>
                <div className="Right" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}> 
                    <img 
                        src={user?.profilePic || ProfileIcon} 
                        alt="Recruiter Avatar" 
                        width="500px" 
                        style={{ 
                            maxHeight: "400px", 
                            objectFit: "cover", 
                            borderRadius: "12px",
                            backgroundColor: user?.profilePic ? "transparent" : "#F0EAEB",
                            border: "3px solid #B7202E"
                        }} 
                    />
                    <div style={{ marginTop: "15px" }}>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            accept="image/*" 
                            onChange={handleImageUpload} 
                            style={{ display: "none" }} 
                        />
                        <button className="Button" type="button" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
                            Change Profile Picture
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    )
}

export default ProfilePageRecruiter;