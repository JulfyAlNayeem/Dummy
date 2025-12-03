import { userRoleList } from "@/constant";
import { useState } from "react";
import { LuChevronsUpDown } from "react-icons/lu";
import { LuChevronDown } from "react-icons/lu";
import { LuChevronUp } from "react-icons/lu";
import { Link } from "react-router-dom";
import SearchInput from "./SearchInput";
import Entries from "./Entries";

const DataTable1 = ({ data, width, columnNames, tBody,taleData }) => {
  const [roleType, setRoleType] = useState(true);
  const [otherType, setOtherType] = useState(false);
  let dynamic_col = columnNames.filter((d) => d.value);
  console.log("123",dynamic_col);

  return (
    <div className="  rounded-md text-gray-100 w-full space-y-5">
      <div className="between pt-5">
        <p className=" py-1 px-2 font-semibold border-b rounded-xl  ml-2">
          User Role List
        </p>{" "}
        <Link
          to={"/adduser"}
          className=" px-3 py-1 rounded-xl font-semibold bg-green-600 hover:bg-transparent border-2 border-green-600 mr-2 "
        >
          Add User
        </Link>
      </div>
      <div className="between px-2">
        <Entries />
        <SearchInput />
      </div>
      <table class="table-auto w-full">
        <thead className="  w-full my-7">
          <tr className=" ">
            {columnNames.map((name) => (
              <th className={`text-start    bg-[#484857]  ${width}`}>
                <button
                  className="between w-full px-3  py-2 text-sm "
                  onClick={() => setRoleType(!roleType)}
                >
                  <p>{name.name}</p>
                  <div>
                    <>
                      {roleType ? (
                        <LuChevronDown className=" font-bold" />
                      ) : (
                        <LuChevronUp />
                      )}
                    </>
                    {roleType && otherType ? (
                      <LuChevronsUpDown className=" font-bold" />
                    ) : null}
                  </div>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="w-full ">
        {tBody}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable1;




{
    {/* <DataTable  data={userRoleList} columnNames={columnNames}/> */}

  /* <>
  {userRoleList.map((data, index) => (
    <tr className="pr-1  hover:bg-slate-700  odd:bg-[#232333] even:bg-slate-80 w-full">
      <td className={`text-start w-[20%] pl-2`}>{data.roleType}</td>
      <td className={`text-start w-[20%] pl-2`}>{data.name}</td>
      <td className={`text-start w-[20%] pl-2`}>{data.description}</td>
      <td className={`text-start w-[20%] pl-2`}>
        <div className="flex items-center gap-2">
          <Link to={data.link}>
            <AiFillEdit className=" text-blue-400" />
          </Link>{" "}
          <button>
            <MdDelete className="text-red-600" />
          </button>{" "}
        </div>
      </td>
      <td className={`text-start  py-3 w-[20%] pl-2`}>
        <Link to={""} className=" text-yellow-400">
          <FaStar />
        </Link>
      </td>
    </tr>
  ))}
</>; */
}

