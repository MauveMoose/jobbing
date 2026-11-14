import PageHeader from "../Navbar/pageHeader";
import { useState, useEffect, useRef } from "react";
import ApplicantIcon from "../../Assets/Images/ApplicantIcon.png";
import ChatIconWhite from "../../Assets/Images/ChatIconWhite.png";
import EditIcon from "../../Assets/Images/EditIcon.png";
import ProfileDetails from "./profileDetails";
import ProfileIcon from "../../Assets/Images/ProfileIcon.png";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { clearUser, setUser } from "../../redux/userSlice";

function ProfilePage(){
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const user = useSelector((state)=>state.user.user);
    const [name, setName] = useState(()=>(user ? user.name :""));
    const fileInputRef = useRef(null);

    useEffect(() => {
        if(user) setName(user.name??"");
        else setName("");
    }, [user]);

    useEffect(() => {
        if (user?._id && user.type !== "recruiters" && !user.company && !user.positions) {
            fetch(`http://localhost:5000/applicants/${user._id}`)
                .then(res => res.json())
                .then(data => {
                    if (data && data.data) {
                        dispatch(setUser({ ...data.data, type: user.type || "applicants" }));
                    }
                })
                .catch(err => console.error("Error syncing applicant profile:", err));
        }
    }, [user?._id, user?.type, user?.company, user?.positions, dispatch]);

    const handleDeleteProfile = async () => {
        if (!user?._id) return;

        if (!window.confirm("Are you sure you want to delete your profile? This action cannot be undone.")) {
            return;
        }

        try {
            const res = await fetch(`http://localhost:5000/applicants/${user._id}`, {
                method: "DELETE",
            });

            const data = await res.json();
            if (res.ok) {
                alert("Your profile has been deleted.");
                dispatch(clearUser());
                navigate("/");
            } else {
                alert(data.message || "Failed to delete profile.");
            }
        } catch (err) {
            console.error("Error deleting profile:", err);
            alert("Error deleting profile.");
        }
    };

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
                const res = await fetch(`http://localhost:5000/applicants/${user._id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ profilePic: base64Image })
                });
                const data = await res.json();
                if (res.ok) {
                    dispatch(setUser({ ...data.user, type: user.type || "applicants" }));
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
                    <br />
                    <button 
                        className="Button" 
                        onClick={handleDeleteProfile} 
                        style={{ width: "220px", marginTop: "20px" }}
                    > 
                        Delete Profile 
                    </button>
                </div>
                <div className="Right" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}> 
                    <img 
                        src={user?.profilePic || ProfileIcon} 
                        alt="Applicant Avatar" 
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

export default ProfilePage;