import PageHeader from "../Navbar/pageHeader";
import { useState, useEffect, useRef } from "react";
import RecruiterIcon from "../../Assets/Images/RecruiterIcon.png";
import ChatIconWhite from "../../Assets/Images/ChatIconWhite.png";
import EditIcon from "../../Assets/Images/EditIcon.png";
import RecruiterDetails from "./recruiterDetails";
import ProfileWhite from "../../Assets/Images/ProfileWhite.png";
import { useNavigate, Navigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { setUser } from "../../redux/userSlice";

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
                const res = await fetch(`http://localhost:5000/recruiters/${user._id}`, {
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
                <img src={ChatIconWhite} alt="Chat!" height="50px"/>
            </div>
            <div className="Textpartition">
                <div className="Left text">
                    <RecruiterDetails />
                </div>
                <div className="Right" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}> 
                    <img src={user?.profilePic || ProfileWhite} alt="Recruiter" width="500px" style={{ maxHeight: "400px", objectFit: "cover", borderRadius: "12px" }} />
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