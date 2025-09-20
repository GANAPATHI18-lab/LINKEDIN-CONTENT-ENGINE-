
import React from 'react';

const Header: React.FC = () => {
    return (
        <header className="w-full p-4 bg-gray-900/80 backdrop-blur-sm border-b border-gray-700 fixed top-0 left-0 z-10">
            <div className="container mx-auto flex items-center justify-center text-center">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">
                        LinkedIn Content Engine
                    </h1>
                    <p className="text-md text-gray-400 mt-1">
                        Powered by Gemini for Ganapathi Kakarla
                    </p>
                </div>
            </div>
        </header>
    );
};

export default Header;