import React, { useState } from 'react';
import SignInDialog from './SignInDialog';
import './SignInButton.css';

const SignInButton = () => {
    const [showDialog, setShowDialog] = useState(false);

    return (
        <>
            <button 
                className="signin-button" 
                onClick={() => setShowDialog(true)}
                aria-label="登入"
            >
                Sign In
            </button>

            {showDialog && (
                <SignInDialog onClose={() => setShowDialog(false)} />
            )}
        </>
    );
};

export default SignInButton; 