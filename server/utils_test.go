package main

import (
	"reflect"
	"testing"
)

func TestQueryParams(t *testing.T) {
	t.Run("formatting query params", func(t *testing.T) {
		type GenericQueryParams struct {
			ParamA string `param:"paramA"`
			ParamB string `param:"paramB"`
		}

		value := GenericQueryParams{
			ParamA: "ValueA",
			ParamB: "ValueB",
		}
		expected := "paramA=ValueA&paramB=ValueB"

		received, err := formatQueryParams(value)
		if err != nil {
			t.Errorf("Unexpected error while formatting query params: %s", err)
		}

		if expected != received {
			t.Errorf("Expected %q but received %q\n", expected, received)
		}

	})

	t.Run("parsing query params", func(t *testing.T) {
		type GenericQueryParams struct {
			ParamA string `param:"paramA"`
			ParamB string `param:"paramB"`
		}

		expected := GenericQueryParams{
			ParamA: "ValueA",
			ParamB: "ValueB",
		}

		res, err := formatQueryParams(expected)

		if err != nil {
			t.Errorf("Unexpected error while formatting query params: %s", err)
		}

		var received GenericQueryParams
		err = parseQueryParams(res, &received)
		if err != nil {
			t.Errorf("Unexpected error while formatting query params: %s", err)
		}

		expectedType := reflect.TypeOf(expected)
		expectedValue := reflect.ValueOf(expected)
		receivedValue := reflect.ValueOf(received)

		for i:= 0; i < expectedValue.NumField(); i++ {
			if expectedValue.Field(i).String() != receivedValue.Field(i).String() {
				t.Errorf("Field %s expected %q got %q", expectedType.Field(i).Name, expectedValue.Field(i).String(), receivedValue.Field(i).String())
			}
		}
	})
}
