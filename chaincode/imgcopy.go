package main

import (
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strconv"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	pb "github.com/hyperledger/fabric/protos/peer"
)

type CopyRightChaincode struct {
}

// ----- Owners ----- //
type Owner struct {
	OwnerId   string `json:"owner_id"`   //User ID的哈希值，ID为隐私数据
	OwnerName string `json:"owner_name"` // Username
	OwnerMail string `json:"owner_mail"` // User's mail box
	//ImgAmount int `json:"img_amount"` //User's image quantity
}

// ----- Images ----- //
type Image struct {
	ImgId    string    `json:"img_id"`    //Image ID 即图像感知哈希值
	ImgTitle string    `json:"img_title"` //Image title
	ImgHash  string    `json:"img_hash"`  //Hash value of current image即图像加密哈希值
	Owner    CopyRight `json:"owner"`
}

type CopyRight struct {
	OwnerId   string `json:"owner_id"`   //User ID的哈希值
	ImgId     string `json:"img_id"`     //Image ID
	OwnerName string `json:"owner_name"` // Username
	OwnerMail string `json:"owner_mail"` // User's mail box
}

// ============================================================================================================================
// Init - initial the chaincode
// ============================================================================================================================
func (t *CopyRightChaincode) Init(stub shim.ChaincodeStubInterface) pb.Response {
	fmt.Println("Image Copyright System Starting...")
	return shim.Success(nil)
}

// ============================================================================================================================
// Invoke - the entry point for invocations
// ============================================================================================================================
func (t *CopyRightChaincode) Invoke(stub shim.ChaincodeStubInterface) pb.Response {

	func_name, func_args := stub.GetFunctionAndParameters()
	fmt.Println("Invoke is running " + func_name)

	if func_name == "uploadCopyright" {
		return t.uploadCopyright(stub, func_args)
	} else if func_name == "transferCopyright" {
		return t.transferCopyright(stub, func_args)
	} else if func_name == "queryCopyrightByImgId" {
		return t.queryCopyrightByImgId(stub, func_args)
	} else if func_name == "queryCopyrightByOwnerID" {
		return t.queryCopyrightByOwnerID(stub, func_args)
	} else if func_name == "queryAllCopyright" {
		return t.queryAllCopyright(stub)
	} else if func_name == "addOwner" {
		return t.addOwner(stub, func_args)
	}

	fmt.Println("invoke did not find func: " + func_name)
	return shim.Error("Received unknown func_name invocation")
}

// ============================================================================================================================
// 上传版权信息
// Input:
//	  owner_id  owner_name  owner_mail  img_id  img_hash  img_title
//	  用户ID哈希	    姓名        邮箱      图像ID  图像Hash   图像名称
// ============================================================================================================================
func (t *CopyRightChaincode) uploadCopyright(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	var err error
	fmt.Println("starting upload Copyright...")

	if len(args) != 6 {
		return shim.Error("Incorrect number of arguments. Expecting 6")
	}

	err = argsCheck(args)
	if err != nil {
		return shim.Error(err.Error())
	}

	owner_id := args[0] //将用户ID的哈希值作为主键
	owner_name := args[1]
	owner_mail := args[2]
	img_id := args[3]
	img_hash := args[4]
	img_title := args[5]

	//检查用户是否存在
	_, err = getOwner(stub, owner_id)
	if err != nil { // 用户不存在
		fmt.Println("Failed to find owner - " + owner_id)
		return shim.Error(err.Error())
	}

	//检查是否存在当前图像版权
	imgCR, err := getImgCopyright(stub, img_id)
	if err == nil { //图像版权已经存在
		fmt.Println("This image copyright already exists - " + img_id)
		fmt.Println(imgCR)
		return shim.Error("This image copyright already exists - " + img_id)
	}

	//手动生成图像版权的json格式信息
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
	err = stub.PutState(img_id, []byte(str)) //以img_id为键存储到账本
	if err != nil {
		return shim.Error(err.Error())
	}

	fmt.Println("--uploading end")
	return shim.Success(nil)
}

// ============================================================================================================================
// 版权转让
// Input:
//		raw_id	img_id	new_owner_id
//		用户ID	图像ID	 新用户ID哈希
// ============================================================================================================================
func (t *CopyRightChaincode) transferCopyright(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	var err error
	fmt.Println("starting transfering Copyright")

	if len(args) != 3 {
		return shim.Error("Incorrect number of arguments. Expecting 3")
	}

	//参数检查
	err = argsCheck(args)
	if err != nil {
		return shim.Error(err.Error())
	}

	owner_id := getStringMd5(args[0]) //计算原始用户ID的哈希
	img_id := args[1]
	new_owner_id := args[2]

	//检查用户是否已经注册
	owner, err := getOwner(stub, new_owner_id)
	if err != nil {
		return shim.Error("This owner does not exist - " + new_owner_id)
	}

	// 获取当前图像状态
	imageAsBytes, err := stub.GetState(img_id)
	if err != nil {
		return shim.Error("Failed to get image")
	}
	res := Image{}
	json.Unmarshal(imageAsBytes, &res) //反序列化json格式

	if res.Owner.OwnerId != owner_id {
		return shim.Error("Not legal tranfer")
	}
	// 转让版权
	res.Owner.OwnerId = new_owner_id //改变版权拥有着信息
	res.Owner.OwnerName = owner.OwnerName
	res.Owner.OwnerMail = owner.OwnerMail
	jsonAsBytes, _ := json.Marshal(res)      //转为字节数组
	err = stub.PutState(img_id, jsonAsBytes) //用图像ID为键重写账单
	if err != nil {
		return shim.Error(err.Error())
	}

	fmt.Println("transfer copyright end")
	return shim.Success(nil)
}

// ============================================================================================================================
// 查询特定图像版权信息-根据图像ID读取当前图像的版权信息
// Input:
//		img_id
//		图像ID
// ===========================================================================================================================
func (t *CopyRightChaincode) queryCopyrightByImgId(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	var err error
	fmt.Println("starting read copyright by image id...")

	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}

	// 参数检测
	err = argsCheck(args)
	if err != nil {
		return shim.Error(err.Error())
	}

	img_id := args[0]
	imgDataAsbytes, err := stub.GetState(img_id) //从账本中读取数据
	if err != nil {
		jsonResp := "{\"Error\":\"Failed to get state for " + img_id + "\"}"
		return shim.Error(jsonResp)
	}

	fmt.Println("- end read")
	return shim.Success(imgDataAsbytes) //返回数据
}

// ============================================================================================================================
// 查询用户所有版权信息-根据图像ID读取当前用户拥有的版权信息
// Input:
//		img_id
//		图像ID
// ===========================================================================================================================
func (t *CopyRightChaincode) queryCopyrightByOwnerID(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	var err error
	fmt.Println("starting read copyright by image id...")

	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}

	// 参数检测
	err = argsCheck(args)
	if err != nil {
		return shim.Error(err.Error())
	}

	owner_id := args[0]
	var copyRight []Image
	// ---- 获取所有版权信息 ---- //
	resultsIterator, err := stub.GetStateByRange("0", "ffffffffffffffff")
	if err != nil {
		return shim.Error(err.Error())
	}
	defer resultsIterator.Close()

	for resultsIterator.HasNext() {
		aCopyright, err := resultsIterator.Next()
		if err != nil {
			return shim.Error(err.Error())
		}
		queryKeyAsStr := aCopyright.Key
		queryValAsBytes := aCopyright.Value
		fmt.Println("Image copyright key" + queryKeyAsStr)
		var image Image
		json.Unmarshal(queryValAsBytes, &image)
		if image.Owner.OwnerId != owner_id {
			break
		}
		copyRight = append(copyRight, image) //添加当前版权信息到列表
	}

	allCopyrightAsBytes, _ := json.Marshal(copyRight) //转为字节数组
	return shim.Success(allCopyrightAsBytes)
}

// ============================================================================================================================
// 查询所有版权信息 - 查询存储在区块链的所有版权信息
// ===========================================================================================================================
func (t *CopyRightChaincode) queryAllCopyright(stub shim.ChaincodeStubInterface) pb.Response {
	var copyRight []Image
	// ---- 获取所有版权信息 ---- //
	resultsIterator, err := stub.GetStateByRange("0", "18446744073709551615")
	if err != nil {
		return shim.Error(err.Error())
	}
	defer resultsIterator.Close()

	for resultsIterator.HasNext() {
		aCopyright, err := resultsIterator.Next()
		if err != nil {
			return shim.Error(err.Error())
		}
		queryKeyAsStr := aCopyright.Key
		queryValAsBytes := aCopyright.Value
		fmt.Println("Image copyright key" + queryKeyAsStr)
		var image Image
		json.Unmarshal(queryValAsBytes, &image)
		copyRight = append(copyRight, image) //添加当前版权信息到列表
	}

	allCopyrightAsBytes, _ := json.Marshal(copyRight) //转为字节数组
	return shim.Success(allCopyrightAsBytes)
}

// ============================================================================================================================
// 注册用户-创建用户并存储其信息
// Input:
//		owner_id	owner_name	owner_mail
//		用户ID哈希		姓名			邮箱
// ============================================================================================================================
func (t *CopyRightChaincode) addOwner(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	var err error
	fmt.Println("starting add owner")

	if len(args) != 3 {
		return shim.Error("Incorrect number of arguments. Expecting 3")
	}

	//参数检测
	err = argsCheck(args)
	if err != nil {
		return shim.Error(err.Error())
	}

	var owner Owner
	owner.OwnerId = args[0]   //用户ID哈希
	owner.OwnerName = args[1] // 用户姓名
	owner.OwnerMail = args[2] //用户邮箱
	fmt.Println(owner.OwnerId + "--" + owner.OwnerName + "--" + owner.OwnerMail)

	//检查当前用户是否已经存在
	_, err = getOwner(stub, owner.OwnerId)
	if err == nil { //已经存在
		fmt.Println("This owner already exists - " + owner.OwnerId)
		return shim.Error("This owner already exists - " + owner.OwnerId)
	}

	//存储用户信息
	ownerAsBytes, _ := json.Marshal(owner)           //转换为字节数组
	err = stub.PutState(owner.OwnerId, ownerAsBytes) //通过用户的ID存储信息
	if err != nil {
		fmt.Println("Could not store user")
		return shim.Error(err.Error())
	}

	return shim.Success(nil)
}

// ========================================================
// 对参数进规范性行检测
// ========================================================
func argsCheck(strs []string) error {
	for i, val := range strs {
		if len(val) <= 0 {
			return errors.New("Argument " + strconv.Itoa(i) + " must be a non-empty string")
		}
		if len(val) > 32 {
			return errors.New("Argument " + strconv.Itoa(i) + " must be a non-empty string")
		}
	}
	return nil
}

// ============================================================================================================================
// 获取用户-通过用户ID从账本中获取用户
// Input:
//		 owner_id
//		 用户ID哈希
// ============================================================================================================================
func getOwner(stub shim.ChaincodeStubInterface, owner_id string) (Owner, error) {
	var owner Owner
	ownerAsBytes, err := stub.GetState(owner_id)
	if err != nil {
		return owner, errors.New("Failed to get owner - " + owner_id)
	}
	json.Unmarshal(ownerAsBytes, &owner) //反序列化json格式

	if len(owner.OwnerName) == 0 { //判断用户是否真实存在或者是空的
		return owner, errors.New("Owner does not exist - " + owner_id + ", `" + owner.OwnerName + "` `" + owner.OwnerMail + "`")
	}

	return owner, nil
}

// ============================================================================================================================
// 获取当前图像所在版权
// ============================================================================================================================
func getImgCopyright(stub shim.ChaincodeStubInterface, img_id string) (Image, error) {
	var image Image
	imageAsBytes, err := stub.GetState(img_id) //从账本中获取键值对信息
	if err != nil {
		return image, errors.New("Failed to find image copyright - " + img_id)
	}
	json.Unmarshal(imageAsBytes, &image) //反序列化json格式

	if image.ImgId != img_id { //判断图像版权是否真实存在或者是空的
		return image, errors.New("Image copyright does not exist - " + img_id)
	}

	return image, nil
}

// ============================================================================================================================
// 获取字符串的Md5哈希值
// Input:
//		plain_text
// ============================================================================================================================
func getStringMd5(plain_text string) string {
	hash := md5.New()
	io.WriteString(hash, plain_text)
	result := hex.EncodeToString(hash.Sum(nil))
	return result
}

// ============================================================================================================================
// Main
// ============================================================================================================================
func main() {
	err := shim.Start(new(CopyRightChaincode))
	if err != nil {
		fmt.Printf("Error starting CopyRight Chaincode - %s", err)
	}
}
