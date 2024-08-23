package logger

import (
	"fmt"
	"os"
	"runtime/debug"
	"strings"
	"time"
)

type Logger struct {
	LogFile *os.File

	ShouldLogDate  bool
	ShouldLogLevel bool
	PrintTraceOnWarnOrError bool
}

type LogLevel string
const (
	LogLevelDebug = "DEBUG"
	LogLevelInfo  = "INFO"
	LogLevelWarn  = "WARN"
	LogLevelError = "ERROR"
)

var logger = Logger{
	ShouldLogDate: true,
	ShouldLogLevel: true,
	PrintTraceOnWarnOrError: true,
}

func SetLogger(newLogger Logger) {
	logger = newLogger
}

func SetLogFile(file *os.File) {
	logger.LogFile = file
}

func Debug(format string, args ...any) {
	Log(LogLevelDebug, format, args...)
}

func Info(format string, args ...any) {
	Log(LogLevelInfo, format, args...)
}

func Warn(format string, args ...any) {
	Log(LogLevelWarn, format, args...)
}

func Error(format string, args ...any) {
	Log(LogLevelError, format, args...)
}

func Log(level LogLevel, format string, args ...any) {
	output := ""

	if logger.ShouldLogDate {
		output += fmt.Sprintf("[%s] ", time.Now().Format("2006-01-02 15:04:05.000"))
	}

	if logger.ShouldLogLevel {
		output += fmt.Sprintf("[%s] ", level)
	}

	output += fmt.Sprintf(format, args...)

	if logger.PrintTraceOnWarnOrError && level == LogLevelError {
		output += formatStackTrace()
	}

	fmt.Print(output)
	writeToFile(output)
}

func formatStackTrace() string {
	const HEADER_TRACE_ROWS = 1
	const STACK_TRACE_CALL_TRACE_ROWS = 2
	const THIS_FUNC_TRACE_ROWS = 2
	const LOG_FUNC_TRACE_ROWS = 2

	rowsToSkip := HEADER_TRACE_ROWS +
		STACK_TRACE_CALL_TRACE_ROWS +
		THIS_FUNC_TRACE_ROWS +
		LOG_FUNC_TRACE_ROWS

	trace := string(debug.Stack())
	splitTrace := strings.Split(trace, "\n")

	output := ""
	for i := rowsToSkip; i < len(splitTrace); i++ {
		output += splitTrace[i] + "\n"
	}

	return output
}

func writeToFile(data string) {
	if logger.LogFile == nil {
		return
	}

	fileInfo, errorFailToGetFileInfo := logger.LogFile.Stat()
	if errorFailToGetFileInfo != nil {
		return
	}

	const PERM_READ_WRITE = 3
	if fileInfo.Mode() >> 7 != PERM_READ_WRITE {
		return
	}

	fmt.Fprint(logger.LogFile, data)
}
