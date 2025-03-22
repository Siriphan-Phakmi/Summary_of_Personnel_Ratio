'use client';

import React, { useState, useRef } from 'react';
import { FaInfoCircle, FaPen, FaEraser, FaCheck } from 'react-icons/fa';

/**
 * คอมโพเนนต์ SignatureSection - แสดงส่วนลงนามข้อมูล
 * @param {Object} props
 * @returns {JSX.Element}
 */
const SignatureSection = ({ formData, handleInputChange, isReadOnly, isDarkMode }) => {
    // Get signature data or default to empty object
    const signatureSection = formData?.signatureSection || {};
    
    // Canvas drawing state
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(!!signatureSection.signature);
    const canvasRef = useRef(null);
    const contextRef = useRef(null);
    
    // Dynamic styling based on dark mode
    const bgColor = isDarkMode ? 'bg-gray-800' : 'bg-white';
    const textColor = isDarkMode ? 'text-white' : 'text-gray-800';
    const inputBgColor = isDarkMode ? 'bg-gray-700' : 'bg-white';
    const inputBorderColor = isDarkMode ? 'border-gray-600' : 'border-gray-300';
    const labelColor = isDarkMode ? 'text-gray-300' : 'text-gray-600';
    const canvasBgColor = isDarkMode ? 'bg-gray-700' : 'bg-gray-100';
    
    // Init canvas when component mounts
    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        canvas.width = canvas.offsetWidth * 2;
        canvas.height = canvas.offsetHeight * 2;
        canvas.style.width = `${canvas.offsetWidth}px`;
        canvas.style.height = `${canvas.offsetHeight}px`;
        
        const context = canvas.getContext('2d');
        context.scale(2, 2);
        context.lineCap = 'round';
        context.strokeStyle = isDarkMode ? 'white' : 'black';
        context.lineWidth = 2;
        contextRef.current = context;
        
        // Load existing signature if available
        if (signatureSection.signature) {
            const img = new Image();
            img.onload = () => {
                contextRef.current.drawImage(img, 0, 0, canvas.width / 2, canvas.height / 2);
                setHasSignature(true);
            };
            img.src = signatureSection.signature;
        }
    }, [isDarkMode, signatureSection.signature]);
    
    // Handle signature drawing
    const startDrawing = (e) => {
        if (isReadOnly) return;
        
        const { offsetX, offsetY } = getCoordinates(e);
        contextRef.current.beginPath();
        contextRef.current.moveTo(offsetX, offsetY);
        setIsDrawing(true);
    };
    
    const draw = (e) => {
        if (!isDrawing || isReadOnly) return;
        
        const { offsetX, offsetY } = getCoordinates(e);
        contextRef.current.lineTo(offsetX, offsetY);
        contextRef.current.stroke();
        setHasSignature(true);
    };
    
    const stopDrawing = () => {
        if (isReadOnly) return;
        
        contextRef.current.closePath();
        setIsDrawing(false);
        
        // Save signature as data URL
        if (hasSignature) {
            const dataUrl = canvasRef.current.toDataURL('image/png');
            handleInputChange({
                target: {
                    name: 'signatureSection.signature',
                    value: dataUrl
                }
            });
        }
    };
    
    // Helper for touch/mouse events
    const getCoordinates = (e) => {
        if (e.touches && e.touches[0]) {
            const rect = canvasRef.current.getBoundingClientRect();
            return {
                offsetX: e.touches[0].clientX - rect.left,
                offsetY: e.touches[0].clientY - rect.top
            };
        }
        return {
            offsetX: e.nativeEvent.offsetX,
            offsetY: e.nativeEvent.offsetY
        };
    };
    
    // Clear signature
    const clearSignature = () => {
        if (isReadOnly) return;
        
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
        
        handleInputChange({
            target: {
                name: 'signatureSection.signature',
                value: ''
            }
        });
    };
    
    // Helper function to render tooltip
    const renderTooltip = (text) => (
        <div className="group relative inline-block">
            <FaInfoCircle className={`inline-block ml-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} cursor-help`} />
            <div className="absolute z-10 w-48 p-2 mt-1 text-sm rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-300 left-full transform -translate-x-1/2 bottom-full mb-1
                 shadow-lg bg-gray-900 text-white">
                {text}
            </div>
        </div>
    );
    
    return (
        <div className={`p-4 rounded-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} ${bgColor} ${textColor}`}>
            <h3 className="text-lg font-medium mb-4">ลงนาม</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className={`block text-sm font-medium mb-1 ${labelColor}`}>
                        ชื่อผู้บันทึก
                        {renderTooltip('ชื่อผู้บันทึกข้อมูล')}
                    </label>
                    <input
                        type="text"
                        name="signatureSection.name"
                        value={signatureSection.name || ''}
                        onChange={handleInputChange}
                        readOnly={isReadOnly}
                        placeholder="ระบุชื่อผู้บันทึก"
                        className={`w-full p-2 rounded-md ${inputBgColor} ${inputBorderColor} border ${textColor} ${isReadOnly ? 'cursor-not-allowed opacity-70' : ''}`}
                    />
                    
                    <label className={`block text-sm font-medium mt-4 mb-1 ${labelColor}`}>
                        ตำแหน่ง
                        {renderTooltip('ตำแหน่งของผู้บันทึกข้อมูล')}
                    </label>
                    <input
                        type="text"
                        name="signatureSection.position"
                        value={signatureSection.position || ''}
                        onChange={handleInputChange}
                        readOnly={isReadOnly}
                        placeholder="ระบุตำแหน่ง"
                        className={`w-full p-2 rounded-md ${inputBgColor} ${inputBorderColor} border ${textColor} ${isReadOnly ? 'cursor-not-allowed opacity-70' : ''}`}
                    />
                    
                    <label className={`block text-sm font-medium mt-4 mb-1 ${labelColor}`}>
                        หมายเหตุ
                        {renderTooltip('ข้อมูลเพิ่มเติมเกี่ยวกับผู้บันทึก')}
                    </label>
                    <textarea
                        name="signatureSection.notes"
                        value={signatureSection.notes || ''}
                        onChange={handleInputChange}
                        readOnly={isReadOnly}
                        rows={3}
                        placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)"
                        className={`w-full p-2 rounded-md ${inputBgColor} ${inputBorderColor} border ${textColor} ${isReadOnly ? 'cursor-not-allowed opacity-70' : ''}`}
                    ></textarea>
                </div>
                
                <div>
                    <label className={`block text-sm font-medium mb-2 ${labelColor}`}>
                        ลายเซ็น
                        {renderTooltip('ลงลายเซ็นดิจิทัล')}
                    </label>
                    
                    <div className={`relative mb-2 ${isReadOnly ? 'opacity-70' : ''}`}>
                        <canvas
                            ref={canvasRef}
                            width="400"
                            height="200"
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                            className={`border-2 rounded-md w-full h-40 ${canvasBgColor} ${inputBorderColor} ${isReadOnly ? 'cursor-not-allowed' : 'cursor-crosshair'}`}
                        />
                        
                        {!hasSignature && !isReadOnly && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <p className="text-gray-400 text-sm">คลิกหรือแตะเพื่อเซ็นชื่อ</p>
                            </div>
                        )}
                    </div>
                    
                    {!isReadOnly && (
                        <div className="flex justify-end space-x-2 mt-2">
                            <button
                                type="button"
                                onClick={clearSignature}
                                className={`px-3 py-1 rounded-md text-sm flex items-center ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
                            >
                                <FaEraser className="mr-1" />
                                ล้าง
                            </button>
                            
                            {hasSignature && (
                                <div className={`px-3 py-1 rounded-md text-sm flex items-center ${isDarkMode ? 'bg-green-800 text-green-100' : 'bg-green-100 text-green-800'}`}>
                                    <FaCheck className="mr-1" />
                                    บันทึกแล้ว
                                </div>
                            )}
                        </div>
                    )}
                    
                    <div className="mt-4">
                        <label className={`block text-sm font-medium mb-1 ${labelColor}`}>
                            วันที่บันทึก
                        </label>
                        <div className={`p-2 rounded-md border ${inputBorderColor} ${inputBgColor}`}>
                            {formData?.date ? new Date(formData.date).toLocaleDateString('th-TH', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            }) : '-'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignatureSection; 