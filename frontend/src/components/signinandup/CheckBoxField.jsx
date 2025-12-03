import { Checkbox } from "@mui/material";
import React from "react";

const CheckBoxField = ({color}) => {
  return (
    <Checkbox
      value="remember"
      defaultChecked
      sx={{
        color: {color},
        "&.Mui-checked": {
          color:{color},
        },
        "&.Mui-label": {
          color: {color},
        },
      }}
    />
  );
};

export default CheckBoxField;
