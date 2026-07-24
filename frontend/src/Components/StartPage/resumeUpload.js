import Logo from "../../Assets/Images/Logo.png"
import { useNavigate } from "react-router-dom";
import FormHeader from "../Navbar/formHeader";
import { useState } from "react";

function ResumeUpload(){
    const navigate = useNavigate();
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e) =>{
        setFile(e.target.files[0]);
    }

    const handleUpload = async () => {
        if(!file) return alert("Please select a resume file first");

        const formData = new FormData();
        formData.append("resume", file);

        try {
            setLoading(true);

            // 1️⃣ Upload resume & get parsed details
            const uploadRes = await fetch("http://localhost:5000/upload-resume", {
                method: "POST",
                body: formData
            });

            if(!uploadRes.ok) throw new Error("Resume parsing failed");

            const parsedData = await uploadRes.json();

            alert("Resume parsed successfully! Review your details and set your password to complete registration.");
            navigate("/register/applicant", { state: { prefilledData: parsedData } });

        } catch(err) {
            console.error(err);
            alert(err.message || "Something went wrong parsing your resume");
        } finally {
            setLoading(false);
        }
    };

    return(
         <div className="Backlayer start">
            <FormHeader />
            <h1 className="Pagetitle"> Upload Resume (PDF)</h1>
            <div>
                <input type="file" accept=".pdf" onChange={handleFileChange} /> <br />
                <button className="Button" onClick={handleUpload} disabled={loading}>
                    {loading ? "Parsing Resume..." : "Extract & Continue"}
                </button> <br />
            </div>
        </div>
    )
}

export default ResumeUpload;