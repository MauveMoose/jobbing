import {useState} from 'react';
import { useNavigate } from 'react-router-dom';

function RegistrationFormRecruiter(){
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name:"",
        email:"",
        password:"",
        positions:[],
        type:"recruiters"
    })

    const [confirm, setConfirm] = useState("");

    const handleChange = (e) => {
        setFormData({...formData, [e.target.name]:e.target.value})
    }

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isSubmitting) return;

        const errors = [];
        if (!formData.name || !formData.name.trim()) errors.push("Full Name is missing");

        const emailRegex = /^[^\s@]+@somaiya\.edu$/i;
        if (!formData.email || !emailRegex.test(formData.email.trim())) {
            errors.push("Email must be a valid @somaiya.edu address");
        }
        if (!formData.password || formData.password.length < 4) {
            errors.push("Password must be at least 4 characters long");
        }
        if (formData.password !== confirm) {
            errors.push("Passwords do not match");
        }

        if (errors.length > 0) {
            return alert("Please fix the following issue(s) before submitting:\n\n• " + errors.join("\n• "));
        }

        setIsSubmitting(true);

        try {
            const res = await fetch("http://localhost:5000/recruiters/register", {
                method:  "POST",
                headers: {"Content-Type":"application/json"},
                body:JSON.stringify({
                    ...formData,
                    name: formData.name.trim(),
                    email: formData.email.trim().toLowerCase()
                }),
            });

            const data = await res.json();
            if(res.ok){
                alert("Registration successful! A verification link has been sent to your email address.");
                navigate("/");
            }
            else{
                alert(data.message || "Registration failed.");
                setIsSubmitting(false);
            }
        } catch (err) {
            console.error(err);
            alert("Registration failed due to a network error.");
            setIsSubmitting(false);
        }
    }

    return(
        <form onSubmit={handleSubmit} noValidate>
            Full name: <input type="text" name="name" value={formData.name} onChange={handleChange} required /> <br />
            Email: <input type="email" name="email" value={formData.email} onChange={handleChange} required /> <br />
            Password: <input type="password" name="password" value={formData.password} onChange={handleChange} required /> <br />
            Confirm password: <input type="password" name="confirm" value={confirm} onChange={(e)=>setConfirm(e.target.value)} required /> <br />
            <button className="Button" type="submit" disabled={isSubmitting}> {isSubmitting ? "Registering..." : "Submit"} </button>
        </form>
    )
}

export default RegistrationFormRecruiter;