import {useState} from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setUser } from '../../redux/userSlice';

function LoginForm(){
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email:"",
        password:"",
    })

    const handleChange = (e) => {
        setFormData({...formData, [e.target.name]:e.target.value})
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
            const currentuser = data.user;
            dispatch(setUser(currentuser));
            alert(data.message);
            navigate(`/welcome/${usertype}`);
        }
        else{
            alert(data.message || "Login failed.");
        }
    }


    return(
        <form onSubmit={(e) => e.preventDefault()}>
            Email: <input type="email" name="email" value={formData.email} onChange={handleChange} required /> <br />
            Password: <input type="password" name="password" value={formData.password} onChange={handleChange} required /> <br />
            <button className="Button" type="button" onClick={()=>handleLogin("applicants")}> Applicant </button> &nbsp;
            <button className="Button" type="button" onClick={()=>handleLogin("recruiters")}> Recruiter </button> &nbsp;
        </form>
    )
}

export default LoginForm;