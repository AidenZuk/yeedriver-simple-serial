# yeedriver-simple-serial
通用数据类的驱动，与485/modbus不同，这些数据会主动上报的

## options说明
+ 基本配置
    目前可能有两种，串口或是网络的
    如果是串口的，那么就会有serial配置项
    
        .serial
        {
            .path   串口路径 如/dev/ttyUSB0等，注意主程序需要和操作权限
            .opts   serialport所对应的参数信息
        }
        
    如果是网络的，那么就有net配置项
            
        .net
        {
            .type  网络类型  client/server
            .ip    ip地址  如果.type是server，这个地址是监听地址，可以是0.0.0.0 如果是client，就是需要连接的目标ip地址
            .port  端口号  如果是server，就是监听端口，如果是client，就是要连接的目标端口
        }

    如果.serial和.net同时配置了，那么.serial优先
    
+ sids配置

        sids是一个对象: 设备id和设备类型
        {devId:devType}

## 应用说明
通用数据驱动类，在根目录下提供一个框架，根据配置启动drivers内相应的实例
驱动根据配置，调用相应的RWActuator来实例化数据读写
驱动根据配置中的sids信息，生成相应的ClassFactory，并且由ClassFactory来创建相应的设备实例

当收到数据时，让每个实例都执行一次OnData分析动作，实例根据自身的配置，检查数据格式是否符合自身的要求，并且分析获取相应的数据
因此，有多少个实例，串口数据可能会被处理多少次，实例注意不得修改串口传入的数据

##实现说明
* 如果一个类型下面有多个设备，没有做优化处理的话，每次数据到达的时候，每个设备都进行一次OnData操作解析，同一种类型的数据，完全可以只需要解析一次就可以。
* 使用一个ClassFactory来进行同一种类型设备的创建、数据解析工作，每次需要创建设备时，由ClassFactory来创建和管理，而收到数据时，由ClassFactory来进行数据解析，数据解析完毕后，由相应的的ClassFactory的实例来调用相应的设备进行处理
* 使用相应的RWActuator来实现读写数据的抽像
       
####       RWActuator
实际的读写类，根据目前的不同，可以分为串口类和网络类，该类具有以下的功能：
* 自动恢复功能，open以后，如果发生错误，将会进行自动重连
* 异步/同步转换功能，因为串口或是网络，打开和关闭都是异步的，通过类后，调用者就是同步的；类内部有状态机进行管理，因此调用者无需考虑端口是否真实打开
* 数据事件， 当实例收到数据时，emit('data',data)事件，调用者使用on('data')即可以处理相应的数据，data是一个数组
* 数据写入   RWActuator提供三种写入的函数：
    * write(data),写入一串数据，data是一个数组，不关心写入的结果
    * writeP(data,timeout)，写入一串数据，返回一个Promise，当数据被写入到相应的Buffer后再返回
        data是一个数组，
        timeout是超时时间值，如果为0,则没有超时
    * writeDrainP(data,timeout)，写入一串数据，返回一个Promise，当数据被完全写入到端口后返回
                data是一个数组，
                timeout是超时时间值，如果为0,则为默认值：10秒

##使用说明



###类扩展说明
####DevBase类

DevBase 基础类，定时了类的框架，所有的应用都需要从该框架继承
       

             
       OnTick()     框架每隔50ms调用一次该函数，用于继承类的超时管理
       
       
       setTimeout(ms100) 设置超时值，当超时该时间值收不到数据时，状态自动恢复成STATE.IDLE
          ms100，超时值，以100ms为单位
       
       STATE={IDLE:0}  定义了一个通用的状态，空闲
####ClassFactory
   类工厂，不同类型的数据解析器，需要生成一个对应的ClassFactory,ClassFactory做以下的工作：
* 当数据到达时，ClassFactory的OnData函数将被调用，相应的ClassFactory的实例进行数据解析

        OnData(data)  数据处理函数，每个继承类都需要重写该函数
               data是一个数组
               
    每个继承类必须重写OnData函数
* ClassFactory的OnTick每50ms被调用一次，Class会根据内部的this.devices里的设备，调用设备的OnTick，由设备实现超时管理
* ClassFactory需要实现一个CreateClass(devId)函数，用于创建一个新的设备实例                   
                   

##驱动类说明

### TLMeter类
是天信无线水表的驱动类，该水表通过无线远传数据，每隔1小时上传一次数据，数据通过串口汇报，数据是类似DLT/645 97协议的



