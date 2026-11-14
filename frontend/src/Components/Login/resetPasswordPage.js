import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import FormHeader from "../Navbar/formHeader";

function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');
    const collection = searchParams.get('collection') || 'applicants';

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!token) {
            return alert("Invalid or missing password reset token.");
        }

        if (!newPassword || newPassword.length < 4) {
            return alert("Password must be at least 4 characters long.");
        }

        if (newPassword !== confirmPassword) {
            return alert("Passwords do not match.");
        }

        setIsSubmitting(true);

        try {
            const res = await fetch("http://localhost:5000/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token: token,
                    collection: collection,
                    newPassword: newPassword
                })
            });

            const data = await res.json();
            if (res.ok) {
                alert(data.message || "Password reset successful! You can now log in.");
                navigate('/login');
            } else {
                alert(data.message || "Failed to reset password.");
                setIsSubmitting(false);
            }
        } catch (err) {
            console.error("Error resetting password:", err);
            alert("Failed to connect to server.");
            setIsSubmitting(false);
        }
    };

    return (
        <div className='Backlayer'>
            <FormHeader />
            <div className="Bodysection">
                <div className="Textpartition title" style={{ justifyContent: 'center', textAlign: 'center' }}>
                    Reset Your Password
                </div>
                <div className="Textpartition" style={{ justifyContent: 'center' }}>
                    <form onSubmit={handleSubmit} style={{ width: "80%", maxWidth: "450px" }}>
                        New Password: <br />
                        <input 
                            type="password" 
                            value={newPassword} 
                            onChange={(e) => setNewPassword(e.target.value)} 
                            placeholder="Enter new password"
                            style={{ width: "100%", height: "35px", fontSize: "18px", margin: "8px 0" }} 
                            required 
                        /> <br /><br />
                        Confirm New Password: <br />
                        <input 
                            type="password" 
                            value={confirmPassword} 
                            onChange={(e) => setConfirmPassword(e.target.value)} 
                            placeholder="Confirm new password"
                            style={{ width: "100%", height: "35px", fontSize: "18px", margin: "8px 0" }} 
                            required 
                        /> <br /><br />
                        <button className="Button" type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Resetting..." : "Set New Password"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default ResetPasswordPage;
