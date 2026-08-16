package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"keskealsaydim/pkg/auth"
	"keskealsaydim/pkg/db"
	"keskealsaydim/pkg/respond"
)

type updateRequest struct {
	Notes        *string `json:"notes"`
	SymbolName   *string `json:"symbolName"`
	DisplayOrder *int    `json:"displayOrder"`
}

func Handler(w http.ResponseWriter, r *http.Request) {
	if respond.CORS(w, r) {
		return
	}

	claims, err := auth.FromRequest(r)
	if err != nil {
		respond.Error(w, http.StatusUnauthorized, "Kimlik doğrulaması gerekli")
		return
	}

	watchID, err := uuid.Parse(strings.TrimSpace(r.URL.Query().Get("id")))
	if err != nil {
		respond.Error(w, http.StatusBadRequest, "Geçersiz ID")
		return
	}

	switch r.Method {
	case http.MethodPatch, http.MethodPut:
		updateItem(w, r, claims, watchID)
	case http.MethodDelete:
		deleteItem(w, claims, watchID)
	default:
		respond.MethodNotAllowed(w)
	}
}

func updateItem(w http.ResponseWriter, r *http.Request, claims *auth.Claims, watchID uuid.UUID) {
	var req updateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "Geçersiz istek gövdesi")
		return
	}

	sets := make([]string, 0, 3)
	args := make([]any, 0, 5)

	if req.Notes != nil {
		notes := strings.TrimSpace(*req.Notes)
		if len([]rune(notes)) > 500 {
			respond.Error(w, http.StatusBadRequest, "Not en fazla 500 karakter olabilir")
			return
		}
		args = append(args, nullStr(notes))
		sets = append(sets, fmt.Sprintf("notes = $%d", len(args)))
	}
	if req.SymbolName != nil {
		name := strings.TrimSpace(*req.SymbolName)
		if name == "" {
			respond.Error(w, http.StatusBadRequest, "Hisse adı boş olamaz")
			return
		}
		args = append(args, name)
		sets = append(sets, fmt.Sprintf("symbol_name = $%d", len(args)))
	}
	if req.DisplayOrder != nil {
		if *req.DisplayOrder < 0 {
			respond.Error(w, http.StatusBadRequest, "Sıra negatif olamaz")
			return
		}
		args = append(args, *req.DisplayOrder)
		sets = append(sets, fmt.Sprintf("display_order = $%d", len(args)))
	}

	if len(sets) == 0 {
		respond.Error(w, http.StatusBadRequest, "Güncellenecek alan bulunamadı")
		return
	}

	pool, err := db.Get()
	if err != nil {
		respond.LogError("watchlist/item", "db connection", err)
		respond.Error(w, http.StatusInternalServerError, "Veritabanı bağlantısı kurulamadı")
		return
	}

	ctx, cancel := respond.Ctx()
	defer cancel()

	args = append(args, watchID, claims.UserID)
	query := fmt.Sprintf("UPDATE watchlist SET %s WHERE id = $%d AND user_id = $%d",
		strings.Join(sets, ", "), len(args)-1, len(args))

	tag, err := pool.Exec(ctx, query, args...)
	if err != nil {
		respond.LogError("watchlist/item", "update", err)
		respond.Error(w, http.StatusInternalServerError, "Kayıt güncellenemedi")
		return
	}
	if tag.RowsAffected() == 0 {
		respond.Error(w, http.StatusNotFound, "Kayıt bulunamadı")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func deleteItem(w http.ResponseWriter, claims *auth.Claims, watchID uuid.UUID) {
	pool, err := db.Get()
	if err != nil {
		respond.LogError("watchlist/item", "db connection", err)
		respond.Error(w, http.StatusInternalServerError, "Veritabanı bağlantısı kurulamadı")
		return
	}

	ctx, cancel := respond.Ctx()
	defer cancel()

	tag, err := pool.Exec(ctx,
		"DELETE FROM watchlist WHERE id = $1 AND user_id = $2",
		watchID, claims.UserID,
	)
	if err != nil {
		respond.LogError("watchlist/item", "delete watchlist item", err)
		respond.Error(w, http.StatusInternalServerError, "Kayıt silinemedi")
		return
	}
	if tag.RowsAffected() == 0 {
		respond.Error(w, http.StatusNotFound, "Kayıt bulunamadı")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func nullStr(s string) any {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	return strings.TrimSpace(s)
}
