import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setUser } from '../../redux/userSlice';

function LoginForm(){
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email:"",
        password:"",
    });
    const [showForgot, setShowForgot] = useState(false);
    const [forgotEmail, setForgotEmail] = useState("");
    const [isSendingReset, setIsSendingReset] = useState(false);

    const handleChange = (e) => {
        setFormData({...formData, [e.target.name]:e.target.value});
    }

    const handleLogin = async (usertype) => {
        const emailRegex = /^[^\s@]+@somaiya\.edu$/i;
        if (!formData.email || !emailRegex.test(formData.email.trim())) {
            return alert("Please enter a valid @somaiya.edu email address.");
        }
        if (!formData.password || !formData.password.trim()) {
            return alert("Please enter your password.");
        }

        const res = await fetch(`http://localhost:5000/${usertype}/login`, {
            method:  "POST",
            headers: {"Content-Type":"application/json"},
            body:JSON.stringify({
                email: formData.email.trim().toLowerCase(),
                password: formData.password
            }),
        });
        const data = await res.json();
        if(res.ok){
            const currentuser = data.data || data.user;
            dispatch(setUser(currentuser));
            alert("Login successful!");
            navigate(`/welcome/${usertype}`);
        }
        else{
            alert(data.message || "Login failed.");
        }
    }

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        const emailRegex = /^[^\s@]+@somaiya\.edu$/i;
        if (!forgotEmail || !emailRegex.test(forgotEmail.trim())) {
            return alert("Please enter a valid @somaiya.edu email address.");
        }

        setIsSendingReset(true);
        try {
            const res = await fetch("http://localhost:5000/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: forgotEmail.trim().toLowerCase() })
            });
            const data = await res.json();
            alert(data.message || "Password reset link request complete.");
            if (res.ok) {
                setShowForgot(false);
                setForgotEmail("");
            }
        } catch (err) {
            console.error(err);
            alert("Failed to connect to server.");
        } finally {
            setIsSendingReset(false);
        }
    };

    return(
        <form onSubmit={(e) => e.preventDefault()}>
            Email: <input type="email" name="email" value={formData.email} onChange={handleChange} required /> <br />
            Password: <input type="password" name="password" value={formData.password} onChange={handleChange} required /> <br />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "20px", flexWrap: "wrap", marginTop: "10px", marginBottom: "15px" }}>
                <button className="Button" type="button" onClick={()=>handleLogin("applicants")}> Applicant Login </button>
                <span style={{ fontSize: "32px", color: "#1A1A1A", fontStyle: "italic", fontWeight: "bold" }}>or...</span>
                <button className="Button" type="button" onClick={()=>handleLogin("recruiters")}> Placement Cell Login </button>
            </div>
            {!showForgot ? (
                <button 
                    type="button" 
                    onClick={() => { setForgotEmail(formData.email); setShowForgot(true); }}
                    style={{ background: "none", border: "none", color: "#1976d2", textDecoration: "underline", cursor: "pointer", fontSize: "16px" }}
                >
                    Forgot Password?
                </button>
            ) : (
                <div style={{ marginTop: "15px", padding: "18px", backgroundColor: "#FAECEE", border: "2px solid #B7202E", borderRadius: "10px", color: "#1A1A1A" }}>
                    <div style={{ fontWeight: "bold", marginBottom: "8px" }}>Reset Password:</div>
                    Registered Email: <br />
                    <input 
                        type="email" 
                        value={forgotEmail} 
                        onChange={(e) => setForgotEmail(e.target.value)} 
                        placeholder="yourname@somaiya.edu"
                        style={{ width: "80%", height: "35px", fontSize: "18px", margin: "8px 0" }} 
                    /> <br />
                    <button className="Button" type="button" onClick={handleForgotPassword} disabled={isSendingReset}>
                        {isSendingReset ? "Sending Link..." : "Send Reset Link"}
                    </button> &nbsp;
                    <button className="Button" type="button" onClick={() => setShowForgot(false)}>
                        Cancel
                    </button>
                </div>
            )}
        </form>
    )
}

export default LoginForm;