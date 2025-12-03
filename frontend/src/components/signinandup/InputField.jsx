import React from "react";
import { TextField } from "@mui/material";

const InputField = ({ label, type, register, errors }) => {
  return (
    <TextField
      margin="normal"
      fullWidth
      label={<span className="text-sm text-gray-400 capitalize">{label}</span>}
      name={label}
      autoComplete={label}
      variant="standard"
      type={type}
      {...register(label, {
        required: `${label} is required!`,
      })}
      error={!!errors[label]}
      helperText={errors[label]?.message}
      inputProps={{ style: { color: '#5fa5fa', fontSize:'16px' } }} 
      sx={{
        "& .MuiInput-underline:before": {
          borderBottomColor: "Indigo",
        },
        "& .MuiInput-underline:after": {
          borderBottomColor: "Indigo",
        },
    
        "& .MuiInput-underline:hover:before": { borderBottomColor: "#5fa5fa" },
    
        "& .MuiInputLabel-root": { color: "red" },
        
        "& .MuiOutlinedInput-root": {
          "& > fieldset": {
            borderRadius: 4,
          },
        },
      }}
    />
  );
};

export default InputField;