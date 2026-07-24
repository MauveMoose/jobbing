import { useState } from 'react'

function SearchBar(){

    const [inputText, setInputText] = useState("");


    return(
        <input type="text" value={inputText} className='Search'
        placeholder='How can we help?'
        onChange={(e)=>setInputText(e.target.value)}
        onMouseLeave={()=>setInputText("")}/>
    )
}

export default SearchBar;