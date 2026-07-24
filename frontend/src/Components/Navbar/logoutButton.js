import Logo from '../../Assets/Images/Logo.png'
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import { clearUser } from '../../redux/userSlice';

function LogoutButton(){
    const user = useSelector((state)=>state.user.user);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const handleLogout = (e) => {
        e.preventDefault();
        dispatch(clearUser());
        navigate("/");
        alert("Logout successful. Please visit again");

    }
    return(
        <button className='Button' onClick={handleLogout}> Logout </button>
    )
}

export default LogoutButton;