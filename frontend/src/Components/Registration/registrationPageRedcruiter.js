import FormHeader from "../Navbar/formHeader";
import RegistrationFormRecruiter from "./registrationFormRecruiter";

/*USE A USE REFERENCE ON THE LOGIN PAGE TO STORE A REFERENCE TO THE
CURRENT USER. THEN, SIMPLY EXTRACT THE CURRENT USER'S DATA WHENEVER NEEDED
*/
function RegistrationPageRecruiter(){

    return(
    <div className='Backlayer'>
        <FormHeader />
        
        <div className="Bodysection">
            <div className="Textpartition title" style={{justifyContent:'center', textAlign:'center'}}>
                Enter your details
            </div>
            <div className="Textpartition">
                <RegistrationFormRecruiter />
            </div>
        </div>
    </div>
    )
}

export default RegistrationPageRecruiter;