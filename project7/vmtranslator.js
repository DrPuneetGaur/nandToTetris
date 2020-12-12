const fs = require('fs');
const readline = require('readline');
const fileName = './BasicTest.vm'; // Need to take file name as an input argument.

const STACK_OPERATIONS_MAP = {
    PUSH: 'push',
    POP : 'pop'
}

const ARITHMETIC_OPERATIONS_MAP = {
    ADD: 'add',
    SUB: 'sub',
    EQ: 'eq',
    LT: 'lt',
    GT: 'gt',
    NEG: 'neg',
    AND: 'and',
    OR: 'or',
    NOT: 'not'
}

const MEMORY_SEGMENTS_MAP = {
    ARGUMENT: 'argument',
    CONSTANT: 'constant' ,
    LOCAL: 'local',
    POINTER: 'pointer',
    STATIC: 'static',
    TEMP: 'temp',
    THAT: 'that',
    THIS: 'this'
}

const MEMORY_SEGMENTS_TO_BIN_SEGMENT_MAP = {
    'argument' : 'ARG',
    'local' : 'LCL',
    'that' : 'THAT',
    'this' : 'THIS'
}

const processedLines = [];

function start(){
  const rd = readline.createInterface({
    input: fs.createReadStream(fileName),
  });

  rd.on('line', function(line){
    const preprocessedLine = removeSpacesAndCommentsFromLine(line);
    if(preprocessedLine.length){
      processedLines.push(preprocessedLine);
    }
  });

  function removeSpacesAndCommentsFromLine(line){
    // Removes all the whitespace in the text file
    line = line.replace(/(\/\*[^*]*\*\/)|(\/\/[^*]*)/g,'').replace(/\n?\t/g, '');
    return line;
  }

  rd.on('close', () => {
    VMTranslator(processedLines);
  });
}

function VMTranslator(lines){
    lines.forEach((line) => {
        return convertToAssembly(line)
    });
}

function convertToAssembly(line){
    const check = fileName.split('/').length
    const file = fileName.split('/')[check-1];
    const instructionOperations = line.split(' ');
    const firstOperation = instructionOperations[0];
    let assemblyCommand;
    if(Object.values(STACK_OPERATIONS_MAP).includes(firstOperation)){
        const memorySegment = instructionOperations[1];
        const index = instructionOperations[2];
        assemblyCommand = handlePushAndPop(firstOperation, memorySegment, index, file);
    }else{
        assemblyCommand = handleArithmeticOperations(firstOperation);
    }
    const writer = fs.createWriteStream(`${fileName.substring(0,fileName.length-3)}.asm`, { flags: 'a'});
    writer.write(assemblyCommand);  
    console.log(assemblyCommand);
}

function handlePushAndPop(command, memorySegment, index, file){
    let assemblyCommandToReturn;
    switch(command){
        case STACK_OPERATIONS_MAP.PUSH:
            return handlePushCommand(memorySegment, index, file);
        case STACK_OPERATIONS_MAP.POP:
            return handlePopCommand(memorySegment, index, file);
    }
    return assemblyCommandToReturn;
}

function handleArithmeticOperations(command){
    let assemblyCommandToReturn;
    switch(command){
        case ARITHMETIC_OPERATIONS_MAP.ADD:
            return handleAddCommand();
        case ARITHMETIC_OPERATIONS_MAP.SUB:
            return handleSubtractCommand();
        case ARITHMETIC_OPERATIONS_MAP.EQ:
            return handleEqualCommand();
        case ARITHMETIC_OPERATIONS_MAP.LT:
            return handleLessThanCommand();
        case ARITHMETIC_OPERATIONS_MAP.GT:
            return handleGreaterThanCommand();
        case ARITHMETIC_OPERATIONS_MAP.NEG:
            return handleNegateCommand();
        case ARITHMETIC_OPERATIONS_MAP.AND:
            return handleAndCommand();
        case ARITHMETIC_OPERATIONS_MAP.OR:
            return handleOrCommand();
        case ARITHMETIC_OPERATIONS_MAP.NOT:
            return handleNotCommand();
    }
    return assemblyCommandToReturn;
}

function handleAddCommand(){
    return (`@SP
            A=M-2
            D=M
            A=M-1
            D=D+M
            A=M-2
            M=D
            @SP
            M=M-1`)
}

function handleSubtractCommand(){
    return (`@SP
            A=M-2
            D=M
            A=M-1
            D=D-M
            A=M-2
            M=D
            @SP
            M=M-1`)
}

let labelCounter = 0;

function handleEqualCommand(){
    return handleBinaryCommand('JEQ');
}

function handleLessThanCommand(){
    return handleBinaryCommand('JLT');
}

function handleGreaterThanCommand(){
    return handleBinaryCommand('JGT');
}

function handleBinaryCommand(assemblyComp){
    const trueLabel = `TRUE_${labelCounter}`;
    const falseLabel = `FALSE_${labelCounter}`;
    const continueLabel = `CONTINUE_${labelCounter}`;
    labelCounter += 1;
    return (`${pushFromStackToDRegisterV2()}
            @SP
            A=M-1
            D=M-D
            @${trueLabel}
            D;${assemblyComp}
            @${falseLabel}
            0;JMP
            (${trueLabel})
            @SP
            A=M-1
            M=-1
            @${continueLabel}
            0;JMP
            (${falseLabel})
            @SP
            A=M-1
            M=0
            @${continueLabel}
            0;JMP
            (${continueLabel})`)
}

function handleNegateCommand(){
    return (
        `${handleUnaryCommand()}
        M=-M`);
}

function handleAndCommand(){
    return (`${pushFromStackToDRegisterV2()}
            @SP
            A=M-1
            M=D&M`)
}

function handleOrCommand(){
    return (`${pushFromStackToDRegisterV2()}
            @SP
            A=M-1
            M=D|M`)
}

function handleNotCommand(){
    return (`${handleUnaryCommand()}
            M=!M`)
}

function handleUnaryCommand(assemblyComp){
    return (`@SP
            A=M-1`)
}

function handlePushCommand(memorySegment, index, file){
    if (memorySegment === MEMORY_SEGMENTS_MAP.CONSTANT){
        return pushConstantToStackV2(index);
    }else if(memorySegment === MEMORY_SEGMENTS_MAP.ARGUMENT || memorySegment === MEMORY_SEGMENTS_MAP.LOCAL || memorySegment === MEMORY_SEGMENTS_MAP.THIS || memorySegment === MEMORY_SEGMENTS_MAP.THAT){
        const binSegment = MEMORY_SEGMENTS_TO_BIN_SEGMENT_MAP[memorySegment];
        return shiftFromMemoryToStackV2(binSegment, index);
    }else if(memorySegment === MEMORY_SEGMENTS_TO_BIN_SEGMENT_MAP.POINTER){
        const register = (3 + Number(index)).toString();
        return shiftFromRegisterToStackV2(register);
    }else if(memorySegment === MEMORY_SEGMENTS_TO_BIN_SEGMENT_MAP.TEMP){
        const register = (5 + Number(index)).toString();
        return shiftFromRegisterToStackV2(register);
    }else{
        return shiftFromStaticToStackV2(index, file);
    }
}

function pushDRegisterToStackV2(){
    return (`@SP
            A=M
            M=D
            @SP
            M=M+1`)
}

function pushConstantToStackV2(index){
    return (`// push constant ${index}
            @${index}
            D=A
            ${pushDRegisterToStackV2()}`)
}

function shiftFromMemoryToStackV2(binSegment,index){
    return (`// push from ${binSegment}[${index}] to stack
            @${index}
            D=A
            @${binSegment}
            A=M+D
            ${pushDRegisterToStackV2()}`)
}

function shiftFromRegisterToStackV2(register){
    return (`@${register}
            D=M
            ${pushDRegisterToStackV2()}`)
}

function shiftFromStaticToStackV2(index, file){
    return (`// push from static ${index} to stack
            @${file}_${index}
            D=M
            ${pushDRegisterToStackV2()}`)
}

function handlePopCommand(memorySegment, index, file){
    if (memorySegment === MEMORY_SEGMENTS_TO_BIN_SEGMENT_MAP.CONSTANT){
        console.log(memorySegment);
    }else if(memorySegment === MEMORY_SEGMENTS_TO_BIN_SEGMENT_MAP.ARGUMENT || memorySegment === MEMORY_SEGMENTS_TO_BIN_SEGMENT_MAP.LOCAL || memorySegment === MEMORY_SEGMENTS_TO_BIN_SEGMENT_MAP.THIS || memorySegment === MEMORY_SEGMENTS_TO_BIN_SEGMENT_MAP.THAT){
        const binSegment = MEMORY_SEGMENTS_TO_BIN_SEGMENT_MAP[memorySegment];
        return shiftFromStackToMemoryV2(binSegment, index);
    }else if(memorySegment === MEMORY_SEGMENTS_TO_BIN_SEGMENT_MAP.POINTER){
        const register = (3 + Number(index)).toString();
        return shiftFromStackToRegisterV2(register);
    }else if(memorySegment === MEMORY_SEGMENTS_TO_BIN_SEGMENT_MAP.TEMP){
        const register = (5 + Number(index)).toString();
        return shiftFromStackToRegisterV2(register);
    }else{
        return shiftFromStackToStaticV2(index, file);
    }
}

function pushFromStackToDRegisterV2(){
    return (`@SP
            M=M-1
            A=M
            D=M`)
}

function shiftFromStackToMemoryV2(binSegment, index){
    return (`// pop from stack to segment ${binSegment} ${index}
            @${index}
            D=A
            @${binSegment}
            D=D+M
            @R13
            M=D
            ${pushFromStackToDRegisterV2()}
            @R13
            A=M
            M=D`);
}

function shiftFromStackToRegisterV2(register){
    return (`// pop from stack to register ${register}
            @SP
            M=M-1
            A=M
            D=M
            @${register}
            M=D`);
}

function shiftFromStackToStaticV2(index, file){
    return (`// pop from stack to static ${index}
            @SP
            M=M-1
            A=M
            D=M
            @${file}_${index}
            M=D`)
}
start()
