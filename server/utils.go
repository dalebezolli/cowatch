package main

import (
	"fmt"
	"reflect"
)

func FindInSlice[T any](slice []T, search T, compare func(T, T) bool) (int, bool) {
	var found = false
	var i = 0

	for !found && i < len(slice) {
		if compare(slice[i], search) {
			found = true
		}

		i++
	}

	return i - 1, found
}

func RemoveFromSlice[T any](slice []T, index int) []T {
	var newSlice = make([]T, index)

	copy(newSlice, slice[:index+1])
	newSlice = append(newSlice, slice[index+1:]...)

	return newSlice
}

// Encode a query params object to a string
// Each field must contain the "param" tag to correctly identify it's name
func formatQueryParams(params any) (string, error) {
	reflectParamType := reflect.TypeOf(params)
	reflectParamValues := reflect.ValueOf(params)
	if reflectParamType.Kind() != reflect.Struct {
		return "", fmt.Errorf("Provide a struct of strings")
	}

	paramString := ""
	for i := 0; i < reflectParamType.NumField(); i++ {
		reflectField := reflectParamType.Field(i)
		paramName := reflectField.Tag.Get("param")

		if len(paramName) == 0 {
			paramName = reflectField.Name
		}

		reflectValue := reflectParamValues.FieldByName(reflectField.Name)
		if reflectValue.Kind() != reflect.String {
			return "", fmt.Errorf("Provide a struct of strings")
		}

		paramString += paramName + `=` + reflectValue.String()

		if i != reflectParamType.NumField()-1 {
			paramString += "&"
		}
	}

	return paramString, nil
}

func parseQueryParams(str string, params any) error {
	fieldTagToPos := make(map[string]int)

	reflectParamType := reflect.TypeOf(params)
	reflectParamValue := reflect.ValueOf(params)
	if reflectParamType.Kind() != reflect.Pointer || reflectParamType.Elem().Kind() != reflect.Struct {
		return fmt.Errorf("Provide a pointer to a struct of strings")
	}

	reflectStruct := reflectParamType.Elem()

	for i := 0; i < reflectStruct.NumField(); i++ {
		if reflectStruct.Field(i).Type.Kind() != reflect.String {
			return fmt.Errorf("Provide a pointer to a struct of strings")
		}

		fieldTagToPos[reflectStruct.Field(i).Tag.Get("param")] = i
	}

	bytes := []byte(str)

	var currentKey string
	isParsingKey := true
	itemStart := 0
	for i := 0; i < len(bytes); i++ {
		if isParsingKey && bytes[i] == '=' {
			currentKey = string(bytes[itemStart:i])
			isParsingKey = false
			itemStart = i + 1
		}

		if !isParsingKey && bytes[i] == '&' {
			pos, exists := fieldTagToPos[currentKey]
			if exists {
				reflectParamValue.Elem().Field(pos).SetString(string(bytes[itemStart:i]))
			}

			isParsingKey = true
			itemStart = i + 1
		}
	}

	pos, exists := fieldTagToPos[currentKey]
	if exists {
		reflectParamValue.Elem().Field(pos).SetString(string(bytes[itemStart:len(bytes)]))
	}

	return nil
}
