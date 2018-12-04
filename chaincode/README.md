### 函数类型：Invoke

    addOwner (stub shim.ChaincodeStubInterface, args []string)
    参数类型：[]string
    参数个数：3
    参数构成：owner_id,owner_name,owner_mail
    参数含义：用户真实ID的MD5值，用户姓名，用户邮箱

    uploadCopyright (stub shim.ChaincodeStubInterface, args []string)
    参数类型：[]string
    参数个数：6
    参数构成：owner_id,owner_name,owner_mail,img_id,img_hash,img_title
    参数含义：用户真实ID的MD5值，用户姓名，用户邮箱,图像感知哈希，图像加密哈希；图像名称

    transferCopyright (stub shim.ChaincodeStubInterface, args []string)
    参数类型：[]string
    参数个数：3
    参数构成：raw_id,img_id,new_owner_id
    参数含义：用户真实ID，图像感知哈希,接收用户ID的MD5值

### 函数类型：Query

    queryCopyrightByImgId (shim.ChaincodeStubInterface, args []string）
    参数类型：[]string
    参数个数：1
    参数构成：img_id
    参数含义：图像感知哈希
    函数返回：json格式版权信息
    str := `{
        "img_id": "` + img_id + `", 
        "img_title": "` + img_title + `", 
        "img_hash": ` + img_hash + `, 
        "owner": {
            "owner_id": "` + owner_id + `", 
            "owner_name": "` + owner_name + `", 
            "owner_mail": "` + owner_mail + `"
        }
    }`
    

    queryCopyrightByOwnerID (shim.ChaincodeStubInterface, args []string）
    参数类型：[]string
    参数个数：1
    参数构成：owner_id
    参数含义：用户真实ID的MD5值
    函数返回：json格式用户拥有的所有版权信息
    

    queryAllCopyright (shim.ChaincodeStubInterface）
    参数类型：null
    参数个数：0
    参数构成：-
    参数含义：-
    函数返回：账本中包含的所有版权信息
    