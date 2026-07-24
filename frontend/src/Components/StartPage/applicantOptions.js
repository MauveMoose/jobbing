import Logo from "../../Assets/Images/Logo.png"
import { useNavigate } from "react-router-dom";
import FormHeader from "../Navbar/formHeader";
import { useState, useEffect } from "react";

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
            const res = await fetch("http://localhost:5000/upload-resume", {
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
            <div>
                <button className="Button" onClick={()=>navigate("/register/applicant")}> Enter your Details </button> <br />
                <button className="Button" onClick={()=>navigate("/resumeupload")}> Extract from resume! </button> <br />
            </div>
        </div>
    )
}

export default ApplicantOptions;