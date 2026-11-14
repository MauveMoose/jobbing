import Logo from "../../Assets/Images/Logo.png"
import { useNavigate } from "react-router-dom";
import FormHeader from "../Navbar/formHeader";
import { useState } from "react";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

function ApplicantOptions(){
    const navigate = useNavigate();
    const [file, setFile] = useState(null);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e) =>{
        setFile(e.target.files[0]);
    }

    const handleUpload = async () => {
        if(!file) return alert("Please select a file first");
        const formData = new FormData();
        formData.append("resume", file);
        try{
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/upload-resume`, {
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:formData,
            });

            if(!res.ok){
                throw new Error("Upload failed");
            }

            const data = await res.json();
            setResult(data);
        }
        catch(err){
            alert("Error uploading resume");
        }
        finally{
            setLoading(false);
        }
    }

    return(
        <div className="Backlayer start">
            <FormHeader />
            <h1 className="Pagetitle"> You want to...</h1>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "20px", flexWrap: "wrap", marginTop: "20px" }}>
                <button className="Button" style={{ width: "260px" }} onClick={()=>navigate("/register/applicant")}> Enter your Details </button>
                <span style={{ fontSize: "36px", color: "#1A1A1A", fontStyle: "italic", fontWeight: "bold" }}>or...</span>
                <button className="Button" style={{ width: "260px" }} onClick={()=>navigate("/resumeupload")}> Extract from resume! </button>
            </div>
        </div>
    )
}

export default ApplicantOptions;