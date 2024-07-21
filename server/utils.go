package main

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

	copy(newSlice, slice[:index + 1])
	newSlice = append(newSlice, slice[index + 1:]...)

	return newSlice
}
