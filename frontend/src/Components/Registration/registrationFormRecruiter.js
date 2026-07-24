import {useState} from 'react';
import { useNavigate } from 'react-router-dom';

function RegistrationFormRecruiter(){
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name:"",
        email:"",
        password:"",
        company:"",
        positions:[],
        type:"recruiters"
    })

    const [confirm, setConfirm] = useState("");

    const handleChange = (e) => {
        setFormData({...formData, [e.target.name]:e.target.value})
    }

    const handleArrayChange = (index, field, value, key) => {
        setFormData((previousFormData) => ({
            ...previousFormData,
            [key]: previousFormData[key].map((item, i)=>
                i === index ? {...item, [field]: value}:item
            ),
        }))
    }

    const addArrayItem = (key, emptyItem) => {
        setFormData((previousFormData) => ({
            ...previousFormData, 
            [key]: [...previousFormData[key], emptyItem],
        }))
    }

    const removeArrayItem = (key, arrayItem) => {
        setFormData((previousFormData) => ({
            ...previousFormData, 
            [key]: previousFormData[key].filter((_, i) => i !== arrayItem),
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault();

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
        if (!formData.company || !formData.company.trim()) {
            errors.push("Company Name is missing");
        }

        if (errors.length > 0) {
            return alert("Please fix the following issue(s) before submitting:\n\n• " + errors.join("\n• "));
        }

        const res = await fetch("http://localhost:5000/recruiters/register", {
            method:  "POST",
            headers: {"Content-Type":"application/json"},
            body:JSON.stringify({
                ...formData,
                name: formData.name.trim(),
                email: formData.email.trim().toLowerCase(),
                company: formData.company.trim()
            }),
        });

        const data = await res.json();
        if(res.ok){
            alert("Registration successful!");
            navigate("/");
        }
        else{
            alert(data.message || "Registration failed.");
        }
    }

    return(
        <form onSubmit={handleSubmit} noValidate>
            Full name: <input type="text" name="name" value={formData.name} onChange={handleChange} required /> <br />
            Email: <input type="email" name="email" value={formData.email} onChange={handleChange} required /> <br />
            Password: <input type="password" name="password" value={formData.password} onChange={handleChange} required /> <br />
            Confirm password: <input type="password" name="confirm" value={confirm} onChange={(e)=>setConfirm(e.target.value)} required /> <br />
            Company: <input type="text" name="company" value={formData.company} onChange={handleChange} required /> <br />
            <button className="Button" type="submit"> Submit </button>
        </form>
    )
}

export default RegistrationFormRecruiter;