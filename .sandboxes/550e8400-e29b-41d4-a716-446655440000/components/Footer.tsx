import React from 'react';

            export default function Footer() {
                return (
                    <div className="bg-${process.env.THEME_PRIMARY_COLOR} py-12 text-white text-6xl font-bold tracking-tight text-center lg:text-left"><p className="text-${process.env.THEME_TEXT_COLOR} text-sm leading-relaxed">Copyright 2024. All rights reserved.</p>
                    </div>
                );
            }