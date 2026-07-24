import FormHeader from "../Navbar/formHeader";
import LoginForm from "./loginForm";

/*USE A USE REFERENCE ON THE LOGIN PAGE TO STORE A REFERENCE TO THE
CURRENT USER. THEN, SIMPLY EXTRACT THE CURRENT USER'S DATA WHENEVER NEEDED
*/
function LoginPage(){

    return(
    <div className='Backlayer'>
        <FormHeader />
        
        <div className="Bodysection">
            <div className="Textpartition title" style={{justifyContent:'center', textAlign:'center'}}>
                Enter your details
            </div>
            <div className="Textpartition">
                <LoginForm />
            </div>
        </div>
    </div>
    )
}

export default LoginPage;