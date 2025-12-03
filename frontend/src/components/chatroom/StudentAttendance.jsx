import React from 'react'
import { IoHandRight } from 'react-icons/io5'
import '../../custom.css'
import { iconColor, navbarIconColor, secondColor } from '../../constant'

const StudentAttendance = () => {
    const { themeIndex } = useUser();
    return (
        <div className='fixed bottom-28 md:right-4 md:bottom-48 md:left-auto left-6'>
            <div className='waterdrop'>
                <div className="ripple border-colors"></div>
                <div className="ripple border-colors"></div>
                <div className="ripple border-colors"></div>
                <div className="ripple border-colors"></div>
                <div className="ripple border-colors"></div>
                <div className="ripple border-colors"></div>
                <div className="ripple border-colors"></div>
            </div>
            <button className={`${navbarIconColor[themeIndex]} fixed bottom-28 md:right-[20=1px] md:bottom-48 md:left-auto left-6 text-2xl cursor-pointer size-8 mb-[6px] ml-1 center rounded-md`}>
                <IoHandRight className={``} />
            </button>
        </div>
    )
}

export default StudentAttendance
