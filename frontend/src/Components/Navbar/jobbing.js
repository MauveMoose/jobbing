import Logo from '../../Assets/Images/Logo.png'
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

function HomeButton(){
    const user = useSelector((state)=>state.user.user);
    const navigate = useNavigate();
    return(
        <img src={Logo} alt="Jobbing Logo" width="300px" onClick={()=>user?navigate(`/welcome/${user.type}`):navigate("/")}/>
    )
}

export default HomeButton;